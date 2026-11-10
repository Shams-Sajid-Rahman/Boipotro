// Labels for the fixed codes the database stores (CHECK-constrained columns).
export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'near_new', label: 'Near New' },
  { value: 'used', label: 'Used' },
  { value: 'heavily_used', label: 'Heavily Used' },
];
export const conditionLabel = (value) => CONDITIONS.find((c) => c.value === value)?.label ?? value;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
];

export const LISTING_STATUSES = {
  active: 'Active',
  reserved: 'Reserved',
  sold: 'Sold',
  removed: 'Removed',
};

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fake_or_misleading', label: 'Fake or misleading' },
  { value: 'prohibited_item', label: 'Prohibited item' },
  { value: 'wrong_price', label: 'Wrong price or bait' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];
export const reportReasonLabel = (v) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

export const MAX_IMAGES = 5;
export const MAX_IMAGE_MB = 5;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
