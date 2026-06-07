/**
 * PLACEHOLDER: Supabase Storage utility
 *
 * Activate by setting:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SUPABASE_STORAGE_BUCKET
 *
 * Then install @supabase/supabase-js and uncomment the implementation below.
 */

const STORAGE_ACTIVATED = false;

// PLACEHOLDER: Uncomment when activating Supabase Storage
// import { createClient } from '@supabase/supabase-js';
//
// function getStorageClient() {
//   const url = process.env.SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) {
//     throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to activate storage');
//   }
//   return createClient(url, key);
// }

/**
 * Upload a file to Supabase Storage.
 * @param {string} bucket - Storage bucket name (defaults to SUPABASE_STORAGE_BUCKET)
 * @param {string} path - Object path within the bucket
 * @param {Buffer|ArrayBuffer} buffer - File contents
 * @param {string} contentType - MIME type
 * @returns {Promise<{ file_url: string }>}
 */
export async function uploadFile(bucket, path, buffer, contentType = 'application/octet-stream') {
  if (!STORAGE_ACTIVATED) {
    throw new Error(
      'PLACEHOLDER: Supabase Storage is not activated. Set env vars and uncomment implementation in backend/src/services/storage.js'
    );
  }
  // PLACEHOLDER implementation:
  // const client = getStorageClient();
  // const bucketName = bucket || process.env.SUPABASE_STORAGE_BUCKET;
  // const { error } = await client.storage.from(bucketName).upload(path, buffer, {
  //   contentType,
  //   upsert: true,
  // });
  // if (error) throw error;
  // return { file_url: getPublicUrl(bucketName, path) };
}

/**
 * Get the public URL for a stored object.
 * @param {string} bucket
 * @param {string} path
 * @returns {string}
 */
export function getPublicUrl(bucket, path) {
  if (!STORAGE_ACTIVATED) {
    throw new Error(
      'PLACEHOLDER: Supabase Storage is not activated. Set env vars and uncomment implementation in backend/src/services/storage.js'
    );
  }
  // PLACEHOLDER implementation:
  // const client = getStorageClient();
  // const bucketName = bucket || process.env.SUPABASE_STORAGE_BUCKET;
  // const { data } = client.storage.from(bucketName).getPublicUrl(path);
  // return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 * @param {string} bucket
 * @param {string} path
 */
export async function deleteFile(bucket, path) {
  if (!STORAGE_ACTIVATED) {
    throw new Error(
      'PLACEHOLDER: Supabase Storage is not activated. Set env vars and uncomment implementation in backend/src/services/storage.js'
    );
  }
  // PLACEHOLDER implementation:
  // const client = getStorageClient();
  // const bucketName = bucket || process.env.SUPABASE_STORAGE_BUCKET;
  // const { error } = await client.storage.from(bucketName).remove([path]);
  // if (error) throw error;
}
