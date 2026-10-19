import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Allow cross-origin requests from your mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Select only lightweight essential fields to optimize download size & speed
    const { data, error } = await supabase
      .from('movies') // Replace 'movies' with your exact Supabase table name if different
      .select('id, title, poster, poster_url, backdrop, rating, year, release_date, duration, description, overview, category, genre, genres, vj, vjs, tags, contentType, type, stream_link, url, trailer_url, episodes, season, episode')
      .order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Set HTTP cache headers so Vercel CDN caches this response for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

    return res.status(200).json({
      success: true,
      total: data ? data.length : 0,
      items: data || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
