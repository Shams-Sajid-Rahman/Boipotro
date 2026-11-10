-- Who bought a sold listing (set from the accepted offer). Enables buyer reviews.
ALTER TABLE listings ADD COLUMN buyer_id BIGINT REFERENCES users (id) ON DELETE SET NULL;
CREATE INDEX idx_listings_buyer ON listings (buyer_id);

DROP TRIGGER trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE OF seller_id, buyer_id, title, author, isbn, edition, category_id, university_id,
                   condition, price, description, status
  ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Editable marketing copy for the homepage, about, contact and footer.
CREATE TABLE site_content (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_messages (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  email      CITEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 3000),
  user_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_content (key, value) VALUES
('hero', $json${
  "headline": "Find Affordable Textbooks. Buy & Sell Used Books with",
  "highlight": "Boipotro",
  "description": "The student marketplace for second-hand university textbooks in Bangladesh. Save money, declutter your shelf and help a junior.",
  "searchPlaceholder": "Search by title, author or ISBN",
  "primaryCta": "Shop Textbooks",
  "secondaryCta": "Sell Your Books",
  "imageUrl": null,
  "imageAlt": "Two university students holding textbooks"
}$json$),
('featured', $json${
  "title": "Featured Textbooks",
  "subtitle": "Popular picks from students near you"
}$json$),
('howItWorks', $json${
  "title": "How It Works",
  "steps": [
    { "icon": "list",   "title": "List Your Book",  "text": "Add the condition and details in under a minute." },
    { "icon": "search", "title": "Browse & Offer",  "text": "Find what you need and make a fair offer." },
    { "icon": "chat",   "title": "Chat & Meet",     "text": "Connect securely in the app and exchange on campus." }
  ]
}$json$),
('messaging', $json${
  "title": "In-App Messaging",
  "description": "Talk to buyers and sellers without sharing your phone number. Agree on a price and a meeting spot, all inside Boipotro.",
  "points": ["Real-time chat for every listing", "Your number stays private", "Full history of every deal"],
  "demo": {
    "contactName": "Ayesha R.",
    "bookTitle": "Calculus: Early Transcendentals",
    "messages": [
      { "from": "them", "text": "Hi! Is the Calculus book still available?" },
      { "from": "me",   "text": "Yes, it's in near new condition." },
      { "from": "them", "text": "Great! Can we meet at the library tomorrow?" },
      { "from": "me",   "text": "Sure, 2 PM works for me." }
    ]
  }
}$json$),
('trust', $json${
  "title": "Trust & Safety",
  "description": "Verified university emails, seller ratings and one-tap reporting keep the community safe.",
  "points": [
    { "title": "Verified students", "text": "A badge shows sellers who signed up with their university email." },
    { "title": "Ratings & reviews", "text": "Buyers rate sellers after each completed sale." },
    { "title": "Meet on campus", "text": "Exchange in busy, public places like your campus library." },
    { "title": "Report a listing", "text": "Spot something wrong? Our team reviews every report." }
  ]
}$json$),
('footer', $json${
  "about": "Boipotro helps university students across Bangladesh buy and sell used textbooks at fair prices.",
  "social": [
    { "platform": "facebook",  "url": "https://facebook.com" },
    { "platform": "instagram", "url": "https://instagram.com" },
    { "platform": "linkedin",  "url": "https://linkedin.com" },
    { "platform": "youtube",   "url": "https://youtube.com" }
  ],
  "copyright": "Boipotro. All rights reserved."
}$json$),
('about', $json${
  "title": "About Boipotro",
  "paragraphs": [
    "Textbooks are one of the biggest costs of university life in Bangladesh. Every semester, thousands of good books sit unused on shelves while new students pay full price.",
    "Boipotro (বইপত্র) connects the two. Seniors list the books they no longer need, juniors find them for a fraction of the price, and both sides meet safely on campus."
  ]
}$json$),
('contact', $json${
  "title": "Contact Us",
  "description": "Questions, feedback or a problem with a listing? Send us a message.",
  "email": "support@boipotro.test",
  "phone": "+880 1700-000000",
  "address": "Bashundhara R/A, Dhaka 1229"
}$json$);
