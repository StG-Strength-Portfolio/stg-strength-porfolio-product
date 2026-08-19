const AGEO_PARTS = [
  "/fonts/ageo/regular-00.b64",
  "/fonts/ageo/regular-01.b64",
  "/fonts/ageo/regular-02.b64",
  "/fonts/ageo/regular-03.b64",
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
  `;
  document.head.appendChild(style);
}

async function loadAgeo() {
  const chunks = await Promise.all(
    AGEO_PARTS.map(async (path) => {
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

  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "font/woff2" }));
  try {
    const face = new FontFace("Ageo", `url(${blobUrl})`, {
      style: "normal",
      weight: "400",
    });
    await face.load();
    document.fonts.add(face);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
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
