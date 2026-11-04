-- Initial categories and featured cities. Admins can extend/modify these later.

insert into public.business_categories (slug, name, name_translations, icon, sort_order) values
  ('restaurants', 'Restaurants & Catering', '{"de": "Restaurants & Catering", "ml": "റെസ്റ്റോറന്റുകളും കാറ്ററിംഗും"}', 'utensils', 10),
  ('grocery', 'Grocery & Supermarkets', '{"de": "Lebensmittel & Supermärkte", "ml": "പലചരക്കും സൂപ്പർമാർക്കറ്റുകളും"}', 'shopping-basket', 20),
  ('healthcare', 'Healthcare & Medical', '{"de": "Gesundheit & Medizin", "ml": "ആരോഗ്യവും വൈദ്യസേവനവും"}', 'stethoscope', 30),
  ('tax-accounting', 'Tax Consultants & Accounting', '{"de": "Steuerberatung & Buchhaltung", "ml": "നികുതി ഉപദേശവും അക്കൗണ്ടിംഗും"}', 'calculator', 40),
  ('it-software', 'IT & Software Services', '{"de": "IT- & Softwaredienstleistungen", "ml": "ഐടി & സോഫ്റ്റ്‌വെയർ സേവനങ്ങൾ"}', 'laptop', 50),
  ('real-estate', 'Real Estate', '{"de": "Immobilien", "ml": "റിയൽ എസ്റ്റേറ്റ്"}', 'building', 60),
  ('travel', 'Travel & Tourism', '{"de": "Reisen & Tourismus", "ml": "യാത്രയും ടൂറിസവും"}', 'plane', 70),
  ('automotive', 'Automotive & Car Services', '{"de": "Kfz & Autoservice", "ml": "വാഹന സേവനങ്ങൾ"}', 'car', 80),
  ('beauty-wellness', 'Beauty & Wellness', '{"de": "Beauty & Wellness", "ml": "സൗന്ദര്യവും വെൽനസും"}', 'sparkles', 90),
  ('cleaning-home-services', 'Cleaning & Home Services', '{"de": "Reinigung & Haushaltsdienste", "ml": "ക്ലീനിംഗ് & ഗൃഹ സേവനങ്ങൾ"}', 'spray-can', 100),
  ('construction-handyman', 'Construction & Handyman', '{"de": "Bau & Handwerk", "ml": "നിർമ്മാണവും കൈപ്പണിയും"}', 'hammer', 110),
  ('education', 'Education & Training', '{"de": "Bildung & Training", "ml": "വിദ്യാഭ്യാസവും പരിശീലനവും"}', 'graduation-cap', 120),
  ('photography-events', 'Photography & Events', '{"de": "Fotografie & Events", "ml": "ഫോട്ടോഗ്രഫിയും ഇവന്റുകളും"}', 'camera', 130),
  ('professional-services', 'Other Professional Services', '{"de": "Sonstige Dienstleistungen", "ml": "മറ്റ് പ്രൊഫഷണൽ സേവനങ്ങൾ"}', 'briefcase', 140)
on conflict (slug) do nothing;

insert into public.cities (slug, name, name_translations, aliases, state, latitude, longitude, is_featured, sort_order) values
  ('munich', 'Munich', '{"de": "München", "ml": "മ്യൂണിക്ക്"}', '{"München","Muenchen","Munchen"}', 'Bayern', 48.1374, 11.5755, true, 10),
  ('berlin', 'Berlin', '{"de": "Berlin", "ml": "ബെർലിൻ"}', '{}', 'Berlin', 52.5200, 13.4050, true, 20),
  ('frankfurt', 'Frankfurt', '{"de": "Frankfurt am Main", "ml": "ഫ്രാങ്ക്ഫർട്ട്"}', '{"Frankfurt am Main","Frankfurt a.M.","Frankfurt/Main"}', 'Hessen', 50.1109, 8.6821, true, 30),
  ('hamburg', 'Hamburg', '{"de": "Hamburg", "ml": "ഹാംബർഗ്"}', '{}', 'Hamburg', 53.5511, 9.9937, true, 40),
  ('stuttgart', 'Stuttgart', '{"de": "Stuttgart", "ml": "സ്റ്റുട്ട്ഗാർട്ട്"}', '{}', 'Baden-Württemberg', 48.7758, 9.1829, true, 50),
  ('duesseldorf', 'Düsseldorf', '{"de": "Düsseldorf", "ml": "ഡ്യൂസൽഡോർഫ്"}', '{"Dusseldorf","Duesseldorf"}', 'Nordrhein-Westfalen', 51.2277, 6.7735, true, 60),
  ('cologne', 'Cologne', '{"de": "Köln", "ml": "കൊളോൺ"}', '{"Köln","Koeln","Koln"}', 'Nordrhein-Westfalen', 50.9375, 6.9603, true, 70),
  ('nuremberg', 'Nuremberg', '{"de": "Nürnberg", "ml": "ന്യൂറെംബർഗ്"}', '{"Nürnberg","Nuernberg","Nurnberg"}', 'Bayern', 49.4521, 11.0767, true, 80),
  ('hannover', 'Hannover', '{"de": "Hannover", "ml": "ഹാനോവർ"}', '{"Hanover"}', 'Niedersachsen', 52.3759, 9.7320, true, 90),
  ('dortmund', 'Dortmund', '{"de": "Dortmund", "ml": "ഡോർട്ട്മുണ്ട്"}', '{}', 'Nordrhein-Westfalen', 51.5136, 7.4653, true, 100)
on conflict (slug) do nothing;
