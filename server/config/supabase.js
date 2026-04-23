const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not found in .env — database features will not work.');
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

module.exports = supabase;
