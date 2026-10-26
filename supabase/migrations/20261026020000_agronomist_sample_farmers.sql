-- Sample farmer profiles for the agronomist dashboard.
--
-- The dashboard reads the shared database, so a fresh project shows an empty
-- Farmers tab until someone records a visit. These six profiles fill that tab
-- with realistic examples across districts, soils and seasons, and they are
-- labelled "Sample data" as their author on every card so nobody mistakes them
-- for a real farmer's record.
--
-- Apply after 20261026010000_agronomist_allowlist.sql. The rows carry fixed ids,
-- so running this file twice changes nothing. Delete them with:
--
--   delete from public.agronomist_records
--    where updated_by_name = 'Sample data';
--
-- Phone numbers use 0788 000 0xx, which is reserved for examples and is not a
-- working farmer's line.

insert into public.agronomist_records
  (id, kind, data, created_by_name, updated_by_name, created_at, updated_at)
values
  (
    '5f1b0c2a-0001-4a10-9c01-000000000001',
    'farmer',
    '{
       "fullName": "Alice Mukamana",
       "phone": "0788 000 001",
       "district": "Nyagatare",
       "sector": "Rwimiyaga",
       "soil": "Sandy",
       "landSizeHa": 1.2,
       "crops": "Maize, beans",
       "season": "A",
       "challenges": "Dry spells after planting, and fall armyworm seen in the neighbouring fields.",
       "previousRecommendation": "Planted maize in the first week of September; keep the soil covered after the first weeding and scout for armyworm twice a week."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '6 days',
    now() - interval '6 days'
  ),
  (
    '5f1b0c2a-0002-4a10-9c01-000000000002',
    'farmer',
    '{
       "fullName": "Jean Bosco Habimana",
       "phone": "0788 000 002",
       "district": "Musanze",
       "sector": "Kinigi",
       "soil": "Volcanic",
       "landSizeHa": 0.8,
       "crops": "Irish potatoes, pyrethrum",
       "season": "B",
       "challenges": "Late blight pressure during the wet weeks.",
       "previousRecommendation": "Use certified seed and keep rows at 75 by 30 cm; remove and bury affected plants as soon as blight appears."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '5f1b0c2a-0003-4a10-9c01-000000000003',
    'farmer',
    '{
       "fullName": "Claudine Nyiraneza",
       "phone": "0788 000 003",
       "district": "Huye",
       "sector": "Ngoma",
       "soil": "Clay",
       "landSizeHa": 2.5,
       "crops": "Beans, sorghum, bananas",
       "season": "A",
       "challenges": "The soil crusts after heavy rain, and the bean yield fell last season.",
       "previousRecommendation": "Add manure before planting and keep the bean rows on the contour so water does not run off the plot."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '4 days',
    now() - interval '4 days'
  ),
  (
    '5f1b0c2a-0004-4a10-9c01-000000000004',
    'farmer',
    '{
       "fullName": "Emmanuel Nshimiyimana",
       "phone": "0788 000 004",
       "district": "Kayonza",
       "sector": "Kabare",
       "soil": "Laterite",
       "landSizeHa": 3,
       "crops": "Cassava, groundnuts",
       "season": "C",
       "challenges": "Cassava mosaic symptoms on the older plants.",
       "previousRecommendation": "Uproot the affected plants early and take cuttings only from clean stock for the next plot."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '5f1b0c2a-0005-4a10-9c01-000000000005',
    'farmer',
    '{
       "fullName": "Solange Uwimana",
       "phone": "0788 000 005",
       "district": "Muhanga",
       "sector": "Shyogwe",
       "soil": "Humic",
       "landSizeHa": 1.5,
       "crops": "Maize, vegetables",
       "season": "B",
       "challenges": "Limited access to fertiliser, and cabbage aphids in the vegetable plot.",
       "previousRecommendation": "Split the fertiliser: half at planting and half at knee height; wash the aphids off with soapy water before trying anything stronger."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '5f1b0c2a-0006-4a10-9c01-000000000006',
    'farmer',
    '{
       "fullName": "Patrick Ndayisaba",
       "phone": "0788 000 006",
       "district": "Rubavu",
       "sector": "Kanama",
       "soil": "Loam",
       "landSizeHa": 0.6,
       "crops": "Tomatoes, onions",
       "season": "A",
       "challenges": "Blight during the long rains, and no storage for the surplus.",
       "previousRecommendation": "Stake the tomatoes and mulch to keep the leaves off the soil; harvest in the morning and keep the crates in the shade."
     }'::jsonb,
    'Sample data',
    'Sample data',
    now() - interval '1 day',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

comment on table public.agronomist_records is
  'Agronomist dashboard records. data is validated by the app schema before write. Sample rows are authored by "Sample data".';
