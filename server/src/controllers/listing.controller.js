import * as listingService from '../services/listing.service.js';

export async function search(req, res) {
  res.json(await listingService.searchListings(req.validated.query, req.user?.id ?? null));
}

export async function featured(req, res) {
  res.json({ data: await listingService.getFeaturedListings(req.validated.query, req.user?.id ?? null) });
}

export async function getById(req, res) {
  res.json({ listing: await listingService.getListingById(req.validated.params.id, req.user) });
}

export async function create(req, res) {
  res.status(201).json({ listing: await listingService.createListing(req.user, req.validated.body, req.files) });
}

export async function update(req, res) {
  res.json({
    listing: await listingService.updateListing(req.validated.params.id, req.user, req.validated.body, req.files),
  });
}

export async function updateStatus(req, res) {
  res.json({
    listing: await listingService.updateListingStatus(req.validated.params.id, req.user, req.validated.body.status),
  });
}

export async function remove(req, res) {
  await listingService.deleteListing(req.validated.params.id, req.user);
  res.status(204).end();
}

export async function mine(req, res) {
  res.json({ data: await listingService.getMyListings(req.user.id, req.validated.query) });
}
