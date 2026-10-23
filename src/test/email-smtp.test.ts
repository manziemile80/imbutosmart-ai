import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { sendSummaryEmail } from "../lib/email.server";

// A mailbox that sends the summary is the way any farmer's address can receive
// it without a verified domain. This check talks to a real SMTP conversation —
// a tiny local server — so the channel is proven end to end rather than only
// stubbed.

type FakeSmtp = { port: number; messages: string[]; close: () => void };

function startFakeSmtp(): Promise<FakeSmtp> {
  return new Promise((resolve) => {
    const messages: string[] = [];
    const sockets = new Set<net.Socket>();

    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.setEncoding("utf8");
      socket.write("220 test.local ESMTP\r\n");

      let buffer = "";
      let inData = false;
      let data = "";

      socket.on("data", (chunk: string) => {
        buffer += chunk;
        let index = buffer.indexOf("\r\n");
        while (index !== -1) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);

          if (inData) {
            if (line === ".") {
              inData = false;
              messages.push(data);
              data = "";
              socket.write("250 2.0.0 Ok: queued\r\n");
            } else {
              data += `${line}\r\n`;
            }
            index = buffer.indexOf("\r\n");
            continue;
          }

          const command = line.toUpperCase();
          if (command.startsWith("EHLO") || command.startsWith("HELO")) {
            socket.write("250-test.local\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
          } else if (command.startsWith("AUTH")) {
            socket.write("235 2.7.0 Authentication successful\r\n");
          } else if (command.startsWith("MAIL FROM") || command.startsWith("RCPT TO")) {
            socket.write("250 2.1.0 Ok\r\n");
          } else if (command.startsWith("DATA")) {
            inData = true;
            socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
          } else if (command.startsWith("QUIT")) {
            socket.write("221 2.0.0 Bye\r\n");
            socket.end();
          } else {
            socket.write("250 2.0.0 Ok\r\n");
          }
          index = buffer.indexOf("\r\n");
        }
      });

      socket.on("error", () => sockets.delete(socket));
      socket.on("close", () => sockets.delete(socket));
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        port: typeof address === "object" && address ? address.port : 0,
        messages,
        close: () => {
          for (const socket of sockets) socket.destroy();
          server.close();
        },
      });
    });
  });
}

const message = {
  to: "manziemile1@gmail.com",
  subject: "Your summary — Kicukiro",
  text: "Hello Aline,\n\nCrops for your field\n• Banana — 91%",
};

afterEach(() => {
  delete process.env["EMAIL_API_KEY"];
  delete process.env["EMAIL_FROM"];
  delete process.env["EMAIL_SMTP_HOST"];
  delete process.env["EMAIL_SMTP_PORT"];
  delete process.env["EMAIL_SMTP_USER"];
  delete process.env["EMAIL_SMTP_PASSWORD"];
});

describe("summary email through a mailbox", () => {
  it("reaches any farmer's address, not only the mail provider's own", async () => {
    const smtp = await startFakeSmtp();
    process.env["EMAIL_SMTP_HOST"] = "127.0.0.1";
    process.env["EMAIL_SMTP_PORT"] = String(smtp.port);
    process.env["EMAIL_SMTP_USER"] = "grower@example.test";
    process.env["EMAIL_SMTP_PASSWORD"] = "app-password";

    try {
      expect(await sendSummaryEmail(message)).toBe("sent");
      expect(smtp.messages).toHaveLength(1);
      const sent = smtp.messages[0] ?? "";
      expect(sent).toContain("To: manziemile1@gmail.com");
      expect(sent).toContain("Kicukiro");
      expect(sent).toContain("Banana");
      expect(sent).toContain("From: ImbutoSmart <grower@example.test>");
    } finally {
      smtp.close();
    }
  });
});
