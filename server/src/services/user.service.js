import { query } from '../db/pool.js';

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.phone, u.role, u.is_verified, u.avatar_url,
         u.department, u.created_at, un.id AS university_id, un.name AS university_name
  FROM users u
  LEFT JOIN universities un ON un.id = u.university_id`;

/** Shape a DB row into the user object the API returns (never includes password_hash). */
export const toUserDto = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  isVerified: row.is_verified,
  avatarUrl: row.avatar_url,
  department: row.department,
  university: row.university_id ? { id: row.university_id, name: row.university_name } : null,
  createdAt: row.created_at,
});

/**
 * Update own profile. Changing university re-checks verification against the email domain.
 * Only provided fields change (COALESCE keeps the old value for NULL params).
 */
export async function updateProfile(userId, { name, phone, department, universityId }) {
  await query(
    `UPDATE users u
     SET name = COALESCE($2, u.name),
         phone = COALESCE($3, u.phone),
         department = COALESCE($4, u.department),
         university_id = COALESCE($5, u.university_id),
         is_verified = CASE WHEN $5::bigint IS NULL THEN u.is_verified ELSE EXISTS (
           SELECT 1 FROM universities un
           WHERE un.id = $5 AND (split_part(u.email::text, '@', 2) = un.email_domain::text
                                 OR split_part(u.email::text, '@', 2) LIKE '%.' || un.email_domain::text)
         ) END
     WHERE u.id = $1`,
    [userId, name ?? null, phone ?? null, department ?? null, universityId ?? null],
  );
  return findUserById(userId);
}

export async function findUserById(id, db = { query }) {
  const { rows } = await db.query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] ? toUserDto(rows[0]) : null;
}
