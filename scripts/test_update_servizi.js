const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envVars = {};
fs.readFileSync(envPath, "utf-8")
  .split("\n")
  .forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2];
  });

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("start");
  const { error } = await supabase
    .from("pages")
    .update({ updated_at: new Date().toISOString() }, { returning: "minimal" })
    .eq("category", "servizi")
    .eq("slug", "servizi-artistici");
  if (error) {
    console.log("error", error.message);
    process.exit(1);
  }
  console.log("ok");
}

main().catch((e) => {
  console.log("fatal", e.message);
  process.exit(1);
});

