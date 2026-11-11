-- Hero copy + background photo from the approved design.
UPDATE site_content
SET value = value || $json${
  "headline": "Find Affordable Textbooks. Buy & Sell Used Books with",
  "highlight": "Boipotro.",
  "description": "A dedicated marketplace for students to exchange textbooks, connect, and save money. Browse, chat, and trade within your campus.",
  "searchPlaceholder": "Search for textbooks by Title, Author, or ISBN...",
  "imageUrl": "/hero-bg.jpg",
  "imageAlt": "Two university students looking at textbooks on campus"
}$json$::jsonb,
    updated_at = now()
WHERE key = 'hero';
