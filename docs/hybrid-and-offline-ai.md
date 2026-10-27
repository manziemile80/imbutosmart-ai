# ImbutoSmart AI — Hybrid and Offline AI Capability

This document describes how ImbutoSmart AI is designed to work with and without an internet connection. It is the detailed reference behind section 20 of the project README.

## 20. Hybrid and Offline AI Capability

ImbutoSmart AI is designed to support farmers both **when an internet connection is available and when there is limited or no internet connectivity**. This hybrid approach is important because some farmers may live or work in areas where internet connectivity is unreliable, expensive, or completely unavailable.

### 20.1 Online Mode

When an internet connection is available, ImbutoSmart AI can use online services to provide updated agricultural information and AI assistance. In this mode, the system can:

- Retrieve coming-days weather forecasts from Open-Meteo.
- Access shared agronomist information and verified agricultural records through the cloud database.
- Provide AI-powered farmer questions and answers.
- Obtain updated seasonal and weather information.
- Provide current agronomist recommendations, input information and insurance guidance where available.
- Synchronize records and recommendations with the shared database.
- Provide voice and language assistance where the configured speech services are available.

The online mode therefore provides the farmer with the most up-to-date information available from the system's connected data sources.

### 20.2 Offline Mode

When there is no internet connection, ImbutoSmart AI should continue providing essential agricultural decision support using information and models that are stored locally on the device.

The offline system can use previously prepared agricultural data, machine-learning models, district climate information, crop suitability rules and cached recommendations to help the farmer identify crops that have a reasonable chance of succeeding.

The offline mode can provide:

- Crop recommendations based on the selected district.
- Crop suitability based on the farmer's selected soil type.
- Expected crop success probability from the locally available model.
- Expected yield information where the required model data are available.
- Seasonal agricultural guidance.
- Previously synchronized district climate information.
- Soil and agronomic guidance.
- Previously downloaded input and manure information.
- Previously available insurance-awareness information.
- Basic AI explanations using a local AI model where the device supports it.
- Previously downloaded agricultural knowledge and guidance.

The system should clearly indicate that offline weather information is based on **stored historical or previously synchronized information**, rather than claiming that it is a live forecast.

### 20.3 Local AI

For AI assistance without internet connectivity, ImbutoSmart AI can use a local AI model. The documented architecture supports **Ollama with Qwen 2.5 3B** as a local chat model option.

This allows the farmer assistant to continue answering appropriate agricultural questions locally without sending every question to an external AI service.

The local AI should use the agricultural evidence available on the device and should clearly indicate when information is unavailable rather than inventing agricultural facts.

### 20.4 Synchronization Between Online and Offline Modes

ImbutoSmart AI follows a hybrid approach in which the application switches between online and offline operation according to network availability.

The general process is:

1. The farmer opens ImbutoSmart AI.
2. The system checks whether an internet connection is available.
3. If internet is available, the system uses online services and synchronizes the latest information.
4. Important agricultural information is cached locally for future offline use.
5. If the connection is lost, the application switches to available local data and models.
6. The farmer can continue receiving crop and agronomic recommendations.
7. When the internet connection becomes available again, the system synchronizes updated information and replaces outdated cached information where appropriate.

This approach allows ImbutoSmart AI to remain useful even when connectivity is unreliable.

### 20.5 Offline Recommendation Principle

The offline recommendation engine should not present its results as guaranteed outcomes. Instead, it should explain that the recommendation represents an estimated suitability or probability based on the agricultural data and models available locally.

For example:

**Farmer input:**

- District: Gatsibo
- Soil type: selected by farmer
- Season: Season A

**Offline system output:**

- Recommended crops
- Estimated success probability
- Expected yield where available
- Soil suitability explanation
- Seasonal guidance
- Input/manure guidance from locally stored information

The farmer can therefore receive useful agricultural guidance even when the device cannot connect to the internet.

### 20.6 Limitations of Offline Mode

The offline mode has some limitations. It cannot provide information that requires a live connection unless that information was previously downloaded or synchronized.

For example, without internet connectivity:

- Coming-days weather forecasts cannot be guaranteed to be current.
- Newly published agricultural information cannot be retrieved.
- Cloud-based agronomist records cannot be synchronized immediately.
- New insurance or input-price information cannot be retrieved until connectivity returns.
- AI capabilities depend on whether the required local AI model is installed and whether the device has sufficient computing resources.

The application should therefore display an **Online**, **Offline**, or **Synchronizing** status so that the farmer understands the source and freshness of the information being provided.

### 20.7 Purpose of the Hybrid Design

The hybrid design ensures that ImbutoSmart AI does not depend completely on continuous internet connectivity. Its objective is to make agricultural decision support accessible to farmers in both connected and poorly connected environments.

The principle is:

> **Connected when possible, useful when offline, synchronized when connected again.**

This makes ImbutoSmart AI more practical for real-world agricultural environments where network availability may vary.

## 21. Updated Project Vision

ImbutoSmart AI aims to bridge the gap between Rwanda's agricultural and meteorological data and the everyday decisions made by farmers. It transforms complex agricultural information into practical, localized and understandable guidance while ensuring that farmers can continue accessing essential recommendations even when internet connectivity is unavailable.

The long-term vision is to provide a **hybrid AI agricultural assistant** that combines machine learning, agricultural statistics, weather information, agronomic knowledge, local AI and offline technology to support better crop decisions, better farm management and more climate-resilient agriculture.

> **"From agricultural data to better decisions, from better decisions to better harvests — online or offline."**

## Where the current build stands

The design above is the target. This is what the shipped app does today, so the document is never read as a promise the code does not keep:

- **Network detection is real.** `src/hooks/use-network.ts` checks `navigator.onLine` and then probes the app's own origin, so a flaky connection switches the farmer to the offline engine and back automatically. The recommendation card shows which path answered.
- **The offline recommender ships.** `src/lib/recommendation-engine.ts` scores crops from the district, the soil and the season in the browser, and `src/lib/local-model.ts` answers for the trained model when the backend is not configured or the server is unreachable.
- **The district record ships with the app.** `src/lib/district-climate.json` (NASA POWER, 2001–2020) and the bundled district geometry are files in the build, never filled in from national totals.
- **A forecast is never presented as live when it is not.** With no connection the weather answer is not fetched, so no forecast figure is shown rather than an old one being passed off as current.
- **The local AI stack runs the same contract.** Ollama with `qwen2.5:3b` is served through the app's own AI gateway (see README section 10), so the browser never holds a provider credential, and missing figures are named rather than invented.
- **Records survive a lost connection.** A dashboard write made offline is kept on the device with a `device-` id and retried when the server is reachable again.
- **Still to build:** the packaged offline install (service worker) and the global Online / Offline / Synchronizing indicator described in 20.6. Today the connection is reported where it matters — on the recommendation itself and in the device-store notice — not as a header pill.
