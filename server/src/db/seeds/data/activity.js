// A little sample activity so later phases (chat, offers, wishlist, reviews) have data to show.
// Listings are referenced by title, users by email.
export const conversations = [
  {
    listing: 'Introduction to Algorithms',
    buyer: 'tanvir.hasan@northsouth.edu',
    messages: [
      { from: 'buyer', body: 'Hi! Is the CLRS book still available?' },
      { from: 'seller', body: 'Yes, it is. Barely used.' },
      { from: 'buyer', body: 'Could we meet at the NSU library tomorrow around 2 PM?' },
    ],
  },
  {
    listing: 'Fundamentals of Electric Circuits',
    buyer: 'sadia.islam@northsouth.edu',
    messages: [
      { from: 'buyer', body: 'Assalamu alaikum, would you take ৳1100?' },
      { from: 'seller', body: 'Walaikum assalam. ৳1200 is my best price.' },
    ],
  },
];

export const offers = [
  { listing: 'Fundamentals of Electric Circuits', buyer: 'sadia.islam@northsouth.edu', amount: 1100, message: 'Can pick up this week.', status: 'pending' },
  { listing: 'Calculus: Early Transcendentals', buyer: 'nusrat.jahan@bracu.ac.bd', amount: 1000, message: null, status: 'rejected' },
  { listing: 'Linear Algebra and Its Applications', buyer: 'mehedi.hasan@cu.ac.bd', amount: 650, message: 'Full price, can pay by bKash.', status: 'accepted' },
];

export const wishlist = [
  { user: 'tanvir.hasan@northsouth.edu', listing: 'Introduction to Algorithms' },
  { user: 'nusrat.jahan@bracu.ac.bd', listing: 'Calculus: Early Transcendentals' },
  { user: 'mehedi.hasan@cu.ac.bd', listing: 'Operating System Concepts' },
];

export const reviews = [
  { reviewer: 'ayesha.rahman@northsouth.edu', listing: 'Database System Concepts', rating: 5, comment: 'Book exactly as described, very friendly seller.' },
  { reviewer: 'arif.chowdhury@bracu.ac.bd', listing: 'Microeconomics', rating: 4, comment: 'Good condition, meetup was quick.' },
];
