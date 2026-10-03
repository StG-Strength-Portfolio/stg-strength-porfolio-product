const AGEO_FACES = [
  {
    weight: "400",
    parts: [
      "/fonts/ageo/regular-00.b64",
      "/fonts/ageo/regular-01.b64",
      "/fonts/ageo/regular-02.b64",
      "/fonts/ageo/regular-03.b64",
    ],
  },
  {
    weight: "500",
    parts: [
      "/fonts/ageo/medium-00.b64",
      "/fonts/ageo/medium-01.b64",
      "/fonts/ageo/medium-rest.b64",
    ],
  },
] as const;

let loading: Promise<void> | null = null;

function installAgeoOverrides() {
  if (document.getElementById("ageo-global-font")) return;

  const style = document.createElement("style");
  style.id = "ageo-global-font";
  style.textContent = `
    :root {
      --font-display: "Ageo", system-ui, sans-serif;
      --font-sans: "Ageo", system-ui, sans-serif;
    }

    html,
    body,
    button,
    input,
    textarea,
    select,
    optgroup,
    .font-display,
    .font-sans,
    .ns,
    .ns * {
      font-family: "Ageo", system-ui, sans-serif !important;
    }

    /* The repository currently contains Ageo Regular (400) and Medium (500).
       Loading both lets the browser synthesize 600/700 from the closer Medium
       master instead of artificially emboldening Regular. */
    h1,
    h2,
    h3,
    .font-semibold,
    .font-bold {
      font-synthesis: weight;
    }
  `;
  document.head.appendChild(style);
}

async function loadFontBytes(parts: readonly string[]) {
  const chunks = await Promise.all(
    parts.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load Ageo font asset: ${path}`);
      return (await response.text()).trim();
    }),
  );

  const binary = atob(chunks.join(""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function loadAgeoFace(weight: string, parts: readonly string[]) {
  const bytes = await loadFontBytes(parts);
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "font/woff2" }));
  try {
    const face = new FontFace("Ageo", `url(${blobUrl})`, {
      style: "normal",
      weight,
    });
    await face.load();
    document.fonts.add(face);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadAgeo() {
  await Promise.all(AGEO_FACES.map((face) => loadAgeoFace(face.weight, face.parts)));
}

export function ensureAgeoFont(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  installAgeoOverrides();

  if (!loading) {
    loading = loadAgeo().catch((error) => {
      loading = null;
      console.error("[font] Failed to load Ageo", error);
    });
  }

  return loading;
}
