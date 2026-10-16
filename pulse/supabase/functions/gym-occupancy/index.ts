Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const resp = await fetch("https://reconline.yorkulions.ca/FacilityOccupancy", {
      headers: { "User-Agent": "Pulse/1.0" },
    });

    if (!resp.ok) {
      throw new Error(`Upstream returned ${resp.status}`);
    }

    const html = await resp.text();

    // Parse all facilities from the server-rendered HTML.
    // Each facility has a <strong>Name</strong> in an <h2>, a canvas with
    // data-occupancy and data-remaining attributes, and a max occupancy in
    // a <span class="visually-hidden"> with "Max Occupancy: N, Current Occupancy: M".
    const facilities: Array<{
      name: string;
      currentOccupancy: number;
      maxOccupancy: number;
      remaining: number;
      percent: number;
    }> = [];

    // Match facility name + its canvas data attributes
    // Pattern: <strong>Name</strong> ... data-occupancy="N" data-remaining="M"
    const facilityRegex = /<strong>([^<]+)<\/strong>[\s\S]*?data-occupancy="(\d+)"\s+data-remaining="(\d+)"/g;
    let match;
    while ((match = facilityRegex.exec(html)) !== null) {
      const name = match[1].trim();
      const occupancy = parseInt(match[2], 10);
      const remaining = parseInt(match[3], 10);
      const max = occupancy + remaining;
      const percent = max > 0 ? Math.round((occupancy / max) * 100) : 0;
      facilities.push({
        name,
        currentOccupancy: occupancy,
        maxOccupancy: max,
        remaining,
        percent,
      });
    }

    if (facilities.length === 0) {
      throw new Error("Could not parse facility data from upstream page");
    }

    // Find the Fitness Centre specifically
    const fitnessCentre = facilities.find((f) =>
      f.name.toLowerCase().includes("fitness centre")
    );

    const result = {
      timestamp: new Date().toISOString(),
      source: "https://reconline.yorkulions.ca/FacilityOccupancy",
      facilities,
      fitnessCentre: fitnessCentre || null,
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
