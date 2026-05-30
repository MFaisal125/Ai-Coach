const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase connection...");
  console.log("URL:", supabaseUrl);
  
  const { data, count, error } = await supabase
    .from("User")
    .select("*", { count: 'exact', head: true });

  if (error) {
    console.error("Error connecting to User table:", error.message);
    if (error.code === 'PGRST116') console.log("Note: Table might exist but no rows match the filter (though we are selecting all).");
  } else {
    console.log("Successfully connected to User table! Count:", count);
  }

  const { data: logs, count: logCount, error: logError } = await supabase
    .from("generation_logs")
    .select("*", { count: 'exact', head: true });

  if (logError) {
    console.error("Error connecting to generation_logs table:", logError.message);
  } else {
    console.log("Successfully connected to generation_logs table! Count:", logCount);
  }
}

test();
