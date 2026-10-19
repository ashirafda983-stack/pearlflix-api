// Add this check right before your pagination logic in browse_api.js
const { q, type, genre, vj, tag, page = 1, perPage = 20, filters, all } = req.query;

try {
    // ... existing filters === '1' code ...

    const p = parseInt(page) || 1;
    const pp = parseInt(perPage) || 20;
    const offset = (p - 1) * pp;

    let query = supabase
      .from('media_library')
      .select('*, episodes(*)', { count: 'exact' });

    if (q && q.trim() !== '') {
      query = query.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
    }
    if (type && type.trim() !== '') {
      query = query.eq('content_type', type.trim());
    }
    if (genre && genre.trim() !== '') {
      query = query.contains('genres', [genre.trim()]);
    }
    if (vj && vj.trim() !== '') {
      query = query.contains('vjs', [vj.trim()]);
    }

    // ONLY APPLY PAGINATION IF 'all=true' IS NOT PASSED
    if (all !== 'true') {
        query = query.range(offset, offset + pp - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, count, error } = await query;
    if (error) throw error;

    // ... mapping items ...
