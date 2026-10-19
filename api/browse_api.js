const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Enable CORS for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q, type, genre, vj, tag, page = 1, perPage = 20, filters } = req.query;

  try {
    // 1. Handle filter options request (?filters=1)
    if (filters === '1') {
      const { data: mediaItems, error } = await supabase
        .from('media_library')
        .select('genres, vjs');

      if (error) throw error;

      const genresSet = new Set();
      const vjsSet = new Set();
      mediaItems.forEach(item => {
        (item.genres || []).forEach(g => genresSet.add(g));
        (item.vjs || []).forEach(v => vjsSet.add(v));
      });

      return res.status(200).json({
        success: true,
        filters: {
          genres: Array.from(genresSet).sort(),
          vjs: Array.from(vjsSet).sort(),
          tags: []
        }
      });
    }

    // 2. Handle main library listing, search, and pagination
    const p = parseInt(page) || 1;
    // Cap perPage flexibly to prevent accidental memory spikes or serverless timeouts
    const pp = Math.min(parseInt(perPage) || 20, 250); 
    const offset = (p - 1) * pp;

    let query = supabase
      .from('media_library')
      .select('*, episodes(*)', { count: 'exact' });

    // Handle Search Queries (Title & Description)
    if (q && q.trim() !== '') {
      const searchTerm = q.trim();
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Handle Content Type (Movie vs Series)
    if (type && type.trim() !== '' && type.toLowerCase() !== 'all') {
      query = query.eq('content_type', type.trim());
    }

    // Handle Genre Filter (Ignores default "All Genres" case)
    if (genre && genre.trim() !== '' && genre.toLowerCase() !== 'all genres') {
      query = query.contains('genres', [genre.trim()]);
    }

    // Handle VJ Filter (Ignores default "All VJs" case)
    if (vj && vj.trim() !== '' && vj.toLowerCase() !== 'all vjs') {
      query = query.contains('vjs', [vj.trim()]);
    }

    // Apply Range Pagination & Order
    query = query
      .range(offset, offset + pp - 1)
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) throw error;

    const items = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      contentType: item.content_type,
      year: item.year,
      description: item.description,
      poster: item.poster,
      backdrop: item.backdrop,
      genres: item.genres || [],
      vjs: item.vjs || [],
      stream_link: item.stream_link,
      episodes: item.episodes ? item.episodes.map(ep => ({
        season: ep.season,
        episode: ep.episode,
        link: ep.link
      })) : []
    }));

    return res.status(200).json({
      success: true,
      page: p,
      perPage: pp,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pp),
      items
    });

  } catch (err) {
    console.error('API Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
