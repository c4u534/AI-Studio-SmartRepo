import { IndexedFile, RepoSnapshot } from './types';

// Google Workspace API endpoints
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DOCS_API_URL = 'https://docs.googleapis.com/v1/documents';

// Declare Google Picker & GAPI types for window
declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

/**
 * Load Google API Client Script for Picker Widget
 */
export async function loadGooglePickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.picker) {
      return resolve();
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => {
            resolve();
          },
          onerror: () => {
            reject(new Error('Failed to load Google Picker widget'));
          }
        });
      } else {
        resolve();
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.body.appendChild(script);
  });
}

/**
 * Open Google Picker to select a Google Drive file or folder
 */
export async function openGooglePicker({
  accessToken,
  viewType = 'all',
  onPick,
  onCancel,
}: {
  accessToken: string;
  viewType?: 'all' | 'sheets' | 'docs' | 'folders';
  onPick: (file: { id: string; name: string; mimeType: string; url: string }) => void;
  onCancel?: () => void;
}) {
  await loadGooglePickerScript();

  if (!window.google || !window.google.picker) {
    throw new Error('Google Picker library is not ready');
  }

  const pickerOrigin =
    window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const builder = new window.google.picker.PickerBuilder();

  if (viewType === 'sheets') {
    builder.addView(window.google.picker.ViewId.SPREADSHEETS);
  } else if (viewType === 'docs') {
    builder.addView(window.google.picker.ViewId.DOCS);
  } else if (viewType === 'folders') {
    builder.addView(window.google.picker.ViewId.FOLDERS);
  } else {
    builder.addView(window.google.picker.ViewId.DOCS);
    builder.addView(window.google.picker.ViewId.SPREADSHEETS);
  }

  builder.setOAuthToken(accessToken);
  builder.setOrigin(pickerOrigin);
  builder.setCallback((data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      onPick({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        url: doc.url || `https://drive.google.com/open?id=${doc.id}`,
      });
    } else if (data.action === window.google.picker.Action.CANCEL) {
      if (onCancel) onCancel();
    }
  });

  const picker = builder.build();
  picker.setVisible(true);
}

/**
 * Export Indexed Repository Snapshot to a formatted Google Sheet
 */
export async function exportToGoogleSheets({
  accessToken,
  snapshot,
  files,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `[GitHub Index] ${snapshot.fullName} - ${snapshot.versionTag}`;

  // 1. Create a new Spreadsheet with custom tabs
  const createRes = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Overview & Version' } },
        { properties: { title: 'Table of Contents' } },
        { properties: { title: 'Branch Coverage' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Sheet: ${err.error?.message || createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Prepare Tab 1: Overview & Version
  const overviewValues = [
    ['GitHub Smart Repository Multi-Indexer — Version Snapshot'],
    ['Repository', snapshot.fullName],
    ['Root URL', snapshot.rootUrl],
    ['Version Tag', snapshot.versionTag],
    ['Commit Log', snapshot.commitMessage],
    ['Total Indexed Files', snapshot.totalFiles],
    ['Total Repository Size (Bytes)', snapshot.totalSize],
    ['Default Branch', snapshot.defaultBranch],
    ['Prioritized Branches Processed', snapshot.prioritizedBranches.join(', ') || 'None specified'],
    ['Indexed Branches', snapshot.indexedBranches.join(', ')],
    ['Created Timestamp', snapshot.createdAt],
    ['Index Author', snapshot.userEmail || 'Authenticated User'],
    [''],
    ['Categorical Breakdown'],
    ...Object.entries(snapshot.categories).map(([cat, count]) => [cat, count]),
  ];

  // 3. Prepare Tab 2: Table of Contents
  const tocHeaders = ['Category', 'File Path', 'Branch', 'Size (Bytes)', 'Language', 'Line Count', 'SHA'];
  const tocRows = files.map((f) => [
    f.category,
    f.path,
    f.branch,
    f.size,
    f.language,
    f.lineCount || 0,
    f.sha,
  ]);
  const tocValues = [tocHeaders, ...tocRows];

  // 4. Prepare Tab 3: Branch Coverage
  const branchMap = new Map<string, { count: number; bytes: number }>();
  files.forEach((f) => {
    const existing = branchMap.get(f.branch) || { count: 0, bytes: 0 };
    existing.count++;
    existing.bytes += f.size;
    branchMap.set(f.branch, existing);
  });

  const branchValues = [
    ['Branch Name', 'Status', 'Files Indexed', 'Total Bytes', 'Priority Rank'],
    ...snapshot.indexedBranches.map((b, idx) => {
      const isPriority = snapshot.prioritizedBranches.some((p) => p.toLowerCase() === b.toLowerCase());
      const stats = branchMap.get(b) || { count: 0, bytes: 0 };
      return [
        b,
        b === snapshot.defaultBranch ? 'Default Branch' : isPriority ? 'Prioritized Branch' : 'Standard Branch',
        stats.count,
        stats.bytes,
        isPriority ? `Rank ${idx + 1} (Priority)` : 'Standard',
      ];
    }),
  ];

  // 5. Batch update cell values across tabs
  const valueUpdateRes = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Overview & Version!A1',
          values: overviewValues,
        },
        {
          range: 'Table of Contents!A1',
          values: tocValues,
        },
        {
          range: 'Branch Coverage!A1',
          values: branchValues,
        },
      ],
    }),
  });

  if (!valueUpdateRes.ok) {
    console.warn('Could not populate all sheet values, sheet created empty:', await valueUpdateRes.text());
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Export Comprehensive Repository Index & Architecture Document to Google Docs
 */
export async function exportToGoogleDocs({
  accessToken,
  snapshot,
  files,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
}): Promise<{ documentId: string; documentUrl: string }> {
  const title = `[Repository Doc] ${snapshot.fullName} - ${snapshot.versionTag}`;

  // 1. Create a new Google Doc
  const createRes = await fetch(DOCS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Doc: ${err.error?.message || createRes.statusText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Prepare text structure
  const topDocs = files.filter((f) => f.category === 'Documentation').slice(0, 15);
  const coreCode = files.filter((f) => f.category === 'Source Code').slice(0, 20);
  const configs = files.filter((f) => f.category === 'Architecture & Config');

  const contentText = [
    `${snapshot.fullName} — Repository Smart Index`,
    `Version: ${snapshot.versionTag} | Indexed by: ${snapshot.userEmail || 'GitHub Multi-Indexer'}`,
    `Date: ${new Date(snapshot.createdAt).toLocaleDateString()} | Root: ${snapshot.rootUrl}`,
    '',
    '1. EXECUTIVE REPOSITORY SUMMARY',
    `Description: ${snapshot.description || 'No description provided in GitHub.'}`,
    `Total Files: ${snapshot.totalFiles} across ${snapshot.indexedBranches.length} branches.`,
    `Prioritized Branches: ${snapshot.prioritizedBranches.join(', ') || 'None (Default branch prioritized)'}`,
    `Default Branch: ${snapshot.defaultBranch}`,
    '',
    '2. CATEGORICAL INVENTORY MATRIX',
    ...Object.entries(snapshot.categories).map(([c, count]) => `• ${c}: ${count} files`),
    '',
    '3. ARCHITECTURE & CONFIGURATION FOUNDATIONS',
    ...configs.map((c) => `• [${c.branch}] ${c.path} (${c.language})`),
    '',
    '4. KEY DOCUMENTATION & README DIGEST',
    ...topDocs.map((d) => `• [${d.branch}] ${d.path} (${(d.size / 1024).toFixed(1)} KB)`),
    '',
    '5. PRIMARY CODE MODULES (SAMPLE OF INDEXED ASSETS)',
    ...coreCode.map((c) => `• [${c.branch}] ${c.path} (${c.language}, ${(c.size / 1024).toFixed(1)} KB)`),
    '',
    '6. COLLATED README CONTENT',
    snapshot.readmeContent ? snapshot.readmeContent.slice(0, 3000) + (snapshot.readmeContent.length > 3000 ? '\n...[Collated README Truncated for Document brevity]...' : '') : 'No README file detected in prioritized branches.',
  ].join('\n');

  // Insert content into the document
  await fetch(`${DOCS_API_URL}/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: contentText,
          },
        },
      ],
    }),
  });

  return { documentId, documentUrl };
}

/**
 * Save Repository Index Metadata and Offline HTML Bundle to Google Drive
 */
export async function saveToGoogleDrive({
  accessToken,
  snapshot,
  files,
  folderName = 'GitHub Smart Repositories',
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  folderName?: string;
}): Promise<{ fileId: string; folderId: string; webViewLink: string }> {
  // 1. Check or create target Drive folder
  let folderId = '';
  const folderSearchRes = await fetch(
    `${DRIVE_API_URL}/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (folderSearchRes.ok) {
    const data = await folderSearchRes.json();
    if (data.files && data.files.length > 0) {
      folderId = data.files[0].id;
    }
  }

  if (!folderId) {
    const createFolderRes = await fetch(`${DRIVE_API_URL}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (createFolderRes.ok) {
      const folderData = await createFolderRes.json();
      folderId = folderData.id;
    }
  }

  // 2. Generate Standalone Offline HTML / Web App bundle
  const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${snapshot.fullName} - Smart Repository Index [${snapshot.versionTag}]</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div class="flex items-center justify-between">
        <div>
          <span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-mono rounded">${snapshot.versionTag}</span>
          <h1 class="text-2xl font-bold mt-2 text-white">${snapshot.fullName}</h1>
          <p class="text-slate-400 text-sm mt-1">${snapshot.description || 'Indexed repository'}</p>
        </div>
        <a href="${snapshot.rootUrl}" target="_blank" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs rounded text-slate-200">View on GitHub</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700 text-sm">
        <div><span class="text-slate-400">Total Files:</span> <span class="font-semibold text-white">${snapshot.totalFiles}</span></div>
        <div><span class="text-slate-400">Total Size:</span> <span class="font-semibold text-white">${(snapshot.totalSize / 1024).toFixed(1)} KB</span></div>
        <div><span class="text-slate-400">Default Branch:</span> <span class="font-semibold text-white">${snapshot.defaultBranch}</span></div>
        <div><span class="text-slate-400">Indexed Branches:</span> <span class="font-semibold text-white">${snapshot.indexedBranches.length}</span></div>
      </div>
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 class="text-lg font-bold text-white mb-4">Table of Contents (${files.length} indexed files)</h2>
      <div class="overflow-x-auto max-h-[600px]">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-700 text-slate-400">
              <th class="py-2 px-3">Category</th>
              <th class="py-2 px-3">Path</th>
              <th class="py-2 px-3">Branch</th>
              <th class="py-2 px-3">Size</th>
              <th class="py-2 px-3">Language</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 font-mono">
            ${files.map(f => `
              <tr class="hover:bg-slate-700/50">
                <td class="py-2 px-3 text-emerald-400 font-sans">${f.category}</td>
                <td class="py-2 px-3 text-slate-200">${f.path}</td>
                <td class="py-2 px-3 text-amber-400">${f.branch}</td>
                <td class="py-2 px-3 text-slate-400">${f.size} B</td>
                <td class="py-2 px-3 text-sky-300 font-sans">${f.language}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

  // 3. Upload file via multipart upload to Google Drive
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `${snapshot.repo}-${snapshot.versionTag}-standalone.html`;
  const metadata = {
    name: fileName,
    mimeType: 'text/html',
    parents: folderId ? [folderId] : [],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html\r\n\r\n' +
    offlineHtml +
    closeDelimiter;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Failed to upload to Google Drive: ${err.error?.message || uploadRes.statusText}`);
  }

  const uploadedFile = await uploadRes.json();
  return {
    fileId: uploadedFile.id,
    folderId,
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
  };
}

/**
 * Upload Snapshot Metadata & Files as formatted JSON to Google Drive
 */
export async function uploadJsonToDrive({
  accessToken,
  snapshot,
  files,
  folderId,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  folderId?: string;
}): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `${snapshot.repo}-${snapshot.versionTag}-metadata.json`;
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    exporter: 'GitHub Smart Repository Multi-Indexer',
    snapshot,
    totalFilesIndexed: files.length,
    files: files.map((f) => ({
      path: f.path,
      branch: f.branch,
      category: f.category,
      size: f.size,
      language: f.language,
      sha: f.sha,
      githubUrl: `https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}`,
      rawUrl: f.rawUrl || `https://raw.githubusercontent.com/${snapshot.fullName}/${f.branch}/${f.path}`,
    })),
  };

  const jsonContent = JSON.stringify(exportPayload, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: folderId ? [folderId] : [],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Failed to upload JSON to Google Drive: ${err.error?.message || uploadRes.statusText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

/**
 * Upload Snapshot Files Matrix as CSV to Google Drive
 */
export async function uploadCsvToDrive({
  accessToken,
  snapshot,
  files,
  folderId,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  folderId?: string;
}): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `${snapshot.repo}-${snapshot.versionTag}-inventory.csv`;

  // Build CSV format
  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const headers = ['Path', 'Branch', 'Category', 'Size (Bytes)', 'Language', 'Line Count', 'SHA', 'GitHub URL'];
  const rows = files.map((f) => [
    escapeCsv(f.path),
    escapeCsv(f.branch),
    escapeCsv(f.category),
    f.size,
    escapeCsv(f.language),
    f.lineCount || 0,
    escapeCsv(f.sha),
    escapeCsv(`https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}`),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const metadata = {
    name: fileName,
    mimeType: 'text/csv',
    parents: folderId ? [folderId] : [],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv\r\n\r\n' +
    csvContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Failed to upload CSV to Google Drive: ${err.error?.message || uploadRes.statusText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

/**
 * Export Selected File URLs to a new Google Doc
 */
export async function exportUrlsToGoogleDocs({
  accessToken,
  snapshot,
  files,
  documentTitle,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  documentTitle?: string;
}): Promise<{ documentId: string; documentUrl: string }> {
  const title = documentTitle || `[URLs] ${snapshot.fullName} - ${files.length} Files`;

  const createRes = await fetch(DOCS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Doc: ${err.error?.message || createRes.statusText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // Build document body text
  let content = `${title}\n`;
  content += `Repository: https://github.com/${snapshot.fullName}\n`;
  content += `Version Tag: ${snapshot.versionTag}\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `Total Files in List: ${files.length}\n\n`;
  content += `FILE URL REGISTRY:\n`;
  content += `------------------------------------------------------------\n`;

  files.forEach((f, idx) => {
    const url = `https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}`;
    content += `${idx + 1}. [${f.branch}] ${f.path}\n   ${url}\n\n`;
  });

  await fetch(`${DOCS_API_URL}/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
  });

  return { documentId, documentUrl };
}

/**
 * Export Selected File URLs to a new Google Sheet
 */
export async function exportUrlsToGoogleSheets({
  accessToken,
  snapshot,
  files,
  sheetTitle,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  sheetTitle?: string;
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = sheetTitle || `[URLs] ${snapshot.fullName} (${files.length} Files)`;

  const createRes = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'File URL List' } }],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Sheet: ${err.error?.message || createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  const headers = ['#', 'File Path', 'Branch', 'Category', 'Size (Bytes)', 'Direct GitHub URL', 'Raw Content URL'];
  const rows = files.map((f, i) => [
    i + 1,
    f.path,
    f.branch,
    f.category,
    f.size,
    `https://github.com/${snapshot.fullName}/blob/${f.branch}/${f.path}`,
    f.rawUrl || `https://raw.githubusercontent.com/${snapshot.fullName}/${f.branch}/${f.path}`,
  ]);

  const values = [
    [`GitHub URL Directory — ${snapshot.fullName} (${snapshot.versionTag})`],
    [`Exported at: ${new Date().toISOString()} | Total Files: ${files.length}`],
    [],
    headers,
    ...rows,
  ];

  await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/File URL List!A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Upload the Complete Agentic Context JSON Construct to Google Drive
 */
export async function uploadAgenticConstructToDrive({
  accessToken,
  snapshot,
  agenticConstruct,
  folderId,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  agenticConstruct: any;
  folderId?: string;
}): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `${snapshot.repo}-${snapshot.versionTag}-complete-agentic-context.json`;
  const jsonContent = JSON.stringify(agenticConstruct, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: folderId ? [folderId] : [],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Failed to upload Agentic Context JSON: ${err.error?.message || uploadRes.statusText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

/**
 * Upload Full Database Record Dump (Snapshot + Files + Schema Context) to Google Drive
 */
export async function uploadDatabaseExportToDrive({
  accessToken,
  snapshot,
  files,
  folderId,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  folderId?: string;
}): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `${snapshot.repo}-${snapshot.versionTag}-database-export.json`;
  const databaseDump = {
    exportedAt: new Date().toISOString(),
    databaseProvider: 'Google Cloud Firestore',
    collection: 'repo_snapshots',
    documentId: snapshot.id,
    rootDocument: snapshot,
    subcollections: {
      files: {
        path: `repo_snapshots/${snapshot.id}/files`,
        count: files.length,
        documents: files,
      },
    },
    schemaMetadata: {
      version: '2.0.0',
      entities: ['RepoSnapshot', 'RepoFile', 'AgenticContext'],
    },
  };

  const jsonContent = JSON.stringify(databaseDump, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: folderId ? [folderId] : [],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Failed to upload Database Export to Drive: ${err.error?.message || uploadRes.statusText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

export interface AllDriveResultsSummary {
  folderId: string;
  folderName: string;
  folderUrl: string;
  agenticJson: { fileId: string; fileName: string; webViewLink: string };
  databaseExport: { fileId: string; fileName: string; webViewLink: string };
  standaloneHtml: { fileId: string; fileName: string; webViewLink: string };
  csvInventory: { fileId: string; fileName: string; webViewLink: string };
  googleSheet?: { spreadsheetId: string; spreadsheetUrl: string };
  googleDoc?: { documentId: string; documentUrl: string };
}

/**
 * Save ALL Databasing and ALL Results to a dedicated Google Drive Folder
 */
export async function saveAllDatabasingAndResultsToDrive({
  accessToken,
  snapshot,
  files,
  agenticConstruct,
  onProgress,
}: {
  accessToken: string;
  snapshot: RepoSnapshot;
  files: IndexedFile[];
  agenticConstruct: any;
  onProgress?: (step: string) => void;
}): Promise<AllDriveResultsSummary> {
  const folderName = `${snapshot.repo}-${snapshot.versionTag}-Smart-Repo-Archive`;
  
  // 1. Create or Find Dedicated Archive Folder
  if (onProgress) onProgress('Creating dedicated Google Drive archive folder...');
  let folderId = '';
  const folderSearchRes = await fetch(
    `${DRIVE_API_URL}/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (folderSearchRes.ok) {
    const data = await folderSearchRes.json();
    if (data.files && data.files.length > 0) {
      folderId = data.files[0].id;
    }
  }

  if (!folderId) {
    const createFolderRes = await fetch(`${DRIVE_API_URL}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (createFolderRes.ok) {
      const folderData = await createFolderRes.json();
      folderId = folderData.id;
    }
  }

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

  // 2. Upload Agentic JSON Construct
  if (onProgress) onProgress('Uploading complete Agentic JSON Construct...');
  const agenticJson = await uploadAgenticConstructToDrive({
    accessToken,
    snapshot,
    agenticConstruct,
    folderId,
  });

  // 3. Upload Full Database Export
  if (onProgress) onProgress('Uploading complete Firestore Database export...');
  const databaseExport = await uploadDatabaseExportToDrive({
    accessToken,
    snapshot,
    files,
    folderId,
  });

  // 4. Upload Inventory CSV
  if (onProgress) onProgress('Uploading file inventory CSV...');
  const csvInventory = await uploadCsvToDrive({
    accessToken,
    snapshot,
    files,
    folderId,
  });

  // 5. Upload Standalone HTML Web App
  if (onProgress) onProgress('Uploading offline standalone HTML web application...');
  const standaloneResult = await saveToGoogleDrive({
    accessToken,
    snapshot,
    files,
    folderName,
  });

  // 6. Generate Google Sheet
  let googleSheet: { spreadsheetId: string; spreadsheetUrl: string } | undefined;
  try {
    if (onProgress) onProgress('Generating multi-tab Google Sheet...');
    googleSheet = await exportToGoogleSheets({
      accessToken,
      snapshot,
      files,
    });
  } catch (sheetErr) {
    console.warn('Google Sheet creation optional failure:', sheetErr);
  }

  // 7. Generate Google Doc
  let googleDoc: { documentId: string; documentUrl: string } | undefined;
  try {
    if (onProgress) onProgress('Generating architecture Google Doc...');
    googleDoc = await exportToGoogleDocs({
      accessToken,
      snapshot,
      files,
    });
  } catch (docErr) {
    console.warn('Google Doc creation optional failure:', docErr);
  }

  if (onProgress) onProgress('All databasing and results successfully saved to Google Drive!');

  return {
    folderId,
    folderName,
    folderUrl,
    agenticJson,
    databaseExport,
    standaloneHtml: {
      fileId: standaloneResult.fileId,
      fileName: `${snapshot.repo}-${snapshot.versionTag}-standalone.html`,
      webViewLink: standaloneResult.webViewLink,
    },
    csvInventory,
    googleSheet,
    googleDoc,
  };
}

