/**
 * ClarityMetrics — free Google automation (replaces Zapier)
 * ---------------------------------------------------------
 * What it does
 *   1. Free sample request (Google Form) → thank-you email to the lead + alert to you.
 *   2. New paid client (onboarding Google Form, shown after Stripe payment)
 *      → client folder in Google Drive + welcome email with the upload checklist + alert to you.
 *   3. Every morning → reminder email listing sample requests you haven't sent yet.
 *   4. Every 10 minutes → when a prospect replies with their data file, Claude analyses it (with real
 *      code, so numbers are calculated, not guessed) and builds a dashboard (PDF + interactive HTML)
 *      from their form answers. You get a "Review" email, and a ready-to-send reply with the PDF
 *      waits in Gmail Drafts. Once you send it, the Status column changes to "Sent" by itself.
 *      Needs a Claude API key: Project Settings (gear icon) → Script properties →
 *      add property  ANTHROPIC_API_KEY  with your key from the Claude Console.
 *
 * One-time setup (about 10 minutes)
 *   1. Go to sheets.new to create a blank Google Sheet. Name it "ClarityMetrics Ops".
 *   2. In that Sheet: Extensions → Apps Script. Delete the sample code, paste this whole file, Save.
 *   3. Fill in the CONFIG block below (at least YOUR_EMAIL).
 *   4. In the toolbar pick  buildEverything  and click Run. Approve the permissions
 *      ("Google hasn't verified this app" → Advanced → Go to project — it's your own script).
 *      It creates both Google Forms, links them to this Sheet, names the tabs, turns on the
 *      automations, and writes the form links into the "Links" tab.
 *   5. In Stripe, edit each Payment Link → After payment → "Don't show confirmation page" →
 *      redirect to the Client onboarding form link from the "Links" tab.
 *
 * Want to change a question later? Edit the form directly. Keep these question titles as they are,
 * because the emails read them: Your name · Email · Business name · Plan · What tools hold your data?
 * · Who should receive the weekly report? (emails, comma separated)
 * File uploads are left out on purpose: Google Forms makes visitors sign in to upload, so prospects
 * reply to the thank-you email with their file instead.
 */

const CONFIG = {
  YOUR_NAME: 'Munjal Patel',
  YOUR_EMAIL: 'mpworksmail@gmail.com',      // where alerts go; also the reply-to on client emails
  BOOKING_LINK: 'https://calendar.app.google/KnHmZs9JgbYsxABm7',
  WEBSITE: 'https://claritymetrics.org',
  ROOT_FOLDER_NAME: 'ClarityMetrics Clients',   // created in your Drive if missing
  SAMPLE_REMINDER_AFTER_DAYS: 1,                // remind you about samples older than this
  Q: {
    name: 'Your name',
    email: 'Email',
    business: 'Business name',
    type: 'Business type',
    tools: 'What tools hold your data?',
    plan: 'Plan',
    recipients: 'Who should receive the weekly report? (emails, comma separated)',
  },
};

const STATUS_HEADER = 'Status';  // column the script adds to each tab

const BUSINESS_TYPES = ['Ecommerce / Shopify store', 'Marketing agency', 'Med spa or clinic', 'Restaurant',
  'Fitness studio', 'Real estate team', 'SaaS', 'Contractor / home services'];
const DATA_TOOLS = ['Shopify', 'QuickBooks', 'Square', 'Stripe', 'Meta Ads', 'Google Ads', 'Google Analytics',
  'HubSpot', 'Salesforce', 'Excel or Google Sheets'];
const PLANS = ['Snapshot Report ($297/month)', 'Insight Dashboard ($597/month)', 'Executive Intelligence ($997/month)'];

/**
 * Run once from a blank Google Sheet. Creates both forms, links them here, names the tabs,
 * lists the links in a "Links" tab, then turns on the automations (setup).
 * Safe to run again: it reuses forms it already made.
 */
function buildEverything() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();

  const sample = getOrCreateForm_(props, 'SAMPLE_FORM_ID', buildSampleForm_);
  const client = getOrCreateForm_(props, 'CLIENT_FORM_ID', buildClientForm_);
  [[sample, 'Samples'], [client, 'Clients']].forEach(([form, tab]) => linkFormToTab_(ss, form, tab));

  const blank = ss.getSheets().find(s => !s.getFormUrl() && s.getLastRow() === 0 && !['Samples', 'Clients'].includes(s.getName()));
  const links = ss.getSheetByName('Links') || (blank ? blank.setName('Links') : ss.insertSheet('Links'));
  links.clear();
  links.getRange(1, 1, 5, 3).setValues([
    ['Form', 'Share this link', 'Edit the form'],
    ['Free sample request (website button)', sample.shortenFormUrl(sample.getPublishedUrl()), sample.getEditUrl()],
    ['Client onboarding (Stripe redirect after payment)', client.shortenFormUrl(client.getPublishedUrl()), client.getEditUrl()],
    ['', '', ''],
    ['Next: put the sample link on your website and the onboarding link into each Stripe Payment Link.', '', ''],
  ]);
  links.getRange('A1:C1').setFontWeight('bold');
  links.autoResizeColumns(1, 3);
  ss.setActiveSheet(links);

  setup();
  Logger.log('Sample form:  ' + sample.getPublishedUrl());
  Logger.log('Client form:  ' + client.getPublishedUrl());
}

function getOrCreateForm_(props, key, builder) {
  const id = props.getProperty(key);
  if (id) { try { return FormApp.openById(id); } catch (e) { /* deleted — make a new one */ } }
  const form = builder();
  props.setProperty(key, form.getId());
  return form;
}

function buildSampleForm_() {
  const f = FormApp.create('Free KPI Sample Report — ClarityMetrics');
  f.setDescription('Tell us a little about your business. You\'ll get an email right away asking for one data export, ' +
    'and your one-page KPI snapshot with a plain-English summary within 2 business days of receiving it. ' +
    'Free, no call, no commitment. Your data is used only to build your report.');
  f.setConfirmationMessage('Thanks! Check your inbox for a short email with the one next step.');
  f.setShowLinkToRespondAgain(false);
  addPersonQuestions_(f);
  f.addMultipleChoiceItem().setTitle(CONFIG.Q.type).setChoiceValues(BUSINESS_TYPES).showOtherOption(true).setRequired(true);
  f.addCheckboxItem().setTitle(CONFIG.Q.tools).setChoiceValues(DATA_TOOLS).showOtherOption(true).setRequired(true);
  f.addParagraphTextItem().setTitle('What is the one question you wish your numbers answered?')
    .setHelpText('For example: "Which marketing channel actually makes money?"');
  return f;
}

function buildClientForm_() {
  const f = FormApp.create('Welcome to ClarityMetrics — Client Onboarding');
  f.setDescription('Thanks for signing up! This takes about 2 minutes. Once you submit, you\'ll get a welcome email ' +
    'with your private folder and the 7-day timeline to your first report.');
  f.setConfirmationMessage('All set. Your welcome email is on its way — check your inbox in the next few minutes.');
  f.setShowLinkToRespondAgain(false);
  addPersonQuestions_(f);
  f.addMultipleChoiceItem().setTitle(CONFIG.Q.plan).setChoiceValues(PLANS).setRequired(true);
  f.addMultipleChoiceItem().setTitle(CONFIG.Q.type).setChoiceValues(BUSINESS_TYPES).showOtherOption(true).setRequired(true);
  f.addCheckboxItem().setTitle(CONFIG.Q.tools).setChoiceValues(DATA_TOOLS).showOtherOption(true).setRequired(true);
  f.addParagraphTextItem().setTitle(CONFIG.Q.recipients).setRequired(true);
  f.addParagraphTextItem().setTitle('Which 3–5 numbers matter most to you?')
    .setHelpText('For example: weekly revenue, repeat customers, cost per lead. Not sure? Leave it blank and we\'ll suggest them.');
  f.addTextItem().setTitle('Link to your logo (optional)').setHelpText('Website or Drive link — used to brand your reports.');
  f.addParagraphTextItem().setTitle('Anything else we should know?');
  return f;
}

function addPersonQuestions_(f) {
  f.addTextItem().setTitle(CONFIG.Q.name).setRequired(true);
  f.addTextItem().setTitle(CONFIG.Q.email).setRequired(true)
    .setValidation(FormApp.createTextValidation().setHelpText('Please enter a valid email address.').requireTextIsEmail().build());
  f.addTextItem().setTitle(CONFIG.Q.business).setRequired(true);
}

function linkFormToTab_(ss, form, tab) {
  if (ss.getSheetByName(tab)) return;  // already linked on an earlier run
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  Utilities.sleep(3000);
  const sheet = SpreadsheetApp.openById(ss.getId()).getSheets().find(s => {
    const url = s.getFormUrl();
    return url && FormApp.openByUrl(url).getId() === form.getId();
  });
  if (!sheet) throw new Error(`Couldn't find the response tab for "${form.getTitle()}". Run buildEverything again.`);
  sheet.setName(tab);
}

/** Run once. Installs the form-submit and daily-reminder triggers. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmitRouter').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('remindOpenSamples').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('processSamples').timeBased().everyMinutes(10).create();
  ['Samples', 'Clients'].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) throw new Error(`Missing tab "${name}". Rename the form response tabs first.`);
    statusColumn_(sheet);
  });
  getRootFolder_();
  try { SpreadsheetApp.getActive().toast('ClarityMetrics automation is on.', 'Done', 10); } catch (e) {}
  Logger.log('ClarityMetrics automation is on.');
}

/** Fires on every form submission and routes by tab name. */
function onFormSubmitRouter(e) {
  const sheet = e.range.getSheet();
  const answers = flatten_(e.namedValues);
  if (sheet.getName() === 'Samples') handleSample_(sheet, e.range.getRow(), answers);
  if (sheet.getName() === 'Clients') handleClient_(sheet, e.range.getRow(), answers);
}

// ── 1. Free sample request ───────────────────────────────────────────────
function handleSample_(sheet, row, a) {
  const first = firstName_(a[CONFIG.Q.name]);
  const email = a[CONFIG.Q.email];
  if (!email) return setStatus_(sheet, row, 'No email given');

  const body =
`Hi ${first},

Thanks for requesting a free sample report from ClarityMetrics.

Next step: reply to this email with one export from ${a[CONFIG.Q.tools] || 'your main tool'} covering the last 3 months (a CSV or Excel file is perfect). Sales, bookings or ad spend all work.

You'll get a one-page KPI snapshot with a short written summary of your own numbers within 2 business days of receiving the file.

Your data is used only to build your report and is never shared.

Prefer to talk first? Book 20 minutes here: ${CONFIG.BOOKING_LINK}

${CONFIG.YOUR_NAME}
ClarityMetrics · ${CONFIG.WEBSITE}`;

  GmailApp.sendEmail(email, 'Your free ClarityMetrics sample report — one quick step', body, {
    name: `${CONFIG.YOUR_NAME} · ClarityMetrics`,
    replyTo: CONFIG.YOUR_EMAIL,
  });
  notifyMe_(`New sample request: ${a[CONFIG.Q.business] || first}`, a);
  setStatus_(sheet, row, 'Auto-replied — waiting for file');
}

// ── 2. New paying client ────────────────────────────────────────────────
function handleClient_(sheet, row, a) {
  const first = firstName_(a[CONFIG.Q.name]);
  const email = a[CONFIG.Q.email];
  const business = a[CONFIG.Q.business] || first || 'New client';

  const folder = getRootFolder_().createFolder(`${business} — ${a[CONFIG.Q.plan] || 'plan'}`);
  ['01 Data uploads', '02 Dashboard', '03 Reports sent'].forEach(n => folder.createFolder(n));
  let shared = false;
  try { folder.addEditor(email); shared = true; } catch (err) { /* not a Google account — files come by email instead */ }

  const uploadLine = shared
    ? `Your private folder is ready: ${folder.getUrl()}\nDrop your exports into "01 Data uploads".`
    : `Reply to this email with your exports attached, and I'll file them in your private folder.`;

  const body =
`Hi ${first},

Welcome to ClarityMetrics — glad to have ${business} on board.

Here's everything that happens next:

1. Send your data (today)
${uploadLine}
What to send: the last 12 months from ${a[CONFIG.Q.tools] || 'your main tools'} (CSV or Excel). If you'd rather connect your tools directly so you never upload again, just reply "connect" and I'll send instructions.

2. Your dashboard is built (days 3–5)
I build it from our proven template for your industry, with your KPIs and logo.

3. Targets and alerts (day 6)
A short email to agree the numbers you want to hit and when you want to hear about problems.

4. First report (day 7)
Your first report arrives with a short video walkthrough. After that it lands automatically every Monday${a[CONFIG.Q.recipients] ? ` for: ${a[CONFIG.Q.recipients]}` : ''}.

Questions anytime — just reply to this email.

${CONFIG.YOUR_NAME}
ClarityMetrics · ${CONFIG.WEBSITE}`;

  if (email) {
    GmailApp.sendEmail(email, `Welcome to ClarityMetrics — your first report in 7 days`, body, {
      name: `${CONFIG.YOUR_NAME} · ClarityMetrics`,
      replyTo: CONFIG.YOUR_EMAIL,
    });
  }
  notifyMe_(`New client: ${business}`, Object.assign({ 'Drive folder': folder.getUrl() }, a));
  setStatus_(sheet, row, `Welcomed · folder ${folder.getUrl()}`);
}

// ── 3. Daily reminder about samples you still owe ───────────────────────
function remindOpenSamples() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Samples');
  if (!sheet || sheet.getLastRow() < 2) return;
  const data = sheet.getDataRange().getValues();
  const head = data[0];
  const iTime = 0, iStatus = head.indexOf(STATUS_HEADER);
  const iBiz = head.indexOf(CONFIG.Q.business), iEmail = head.indexOf(CONFIG.Q.email);
  const cutoff = Date.now() - CONFIG.SAMPLE_REMINDER_AFTER_DAYS * 864e5;

  const open = data.slice(1).filter(r =>
    !/sent|done|skip|being built/i.test(String(r[iStatus])) && new Date(r[iTime]).getTime() < cutoff);
  if (!open.length) return;

  const lines = open.map(r => `• ${r[iBiz] || '(no business name)'} — ${r[iEmail]} — requested ${Utilities.formatDate(new Date(r[iTime]), Session.getScriptTimeZone(), 'MMM d')}`);
  GmailApp.sendEmail(CONFIG.YOUR_EMAIL, `ClarityMetrics: ${open.length} sample report(s) still open`,
    `These sample requests haven't been marked "Sent" in the Status column:\n\n${lines.join('\n')}\n\nWhen you send one, type "Sent" in its Status cell and it drops off this list.\n\n${SpreadsheetApp.getActive().getUrl()}`);
}

// ── helpers ─────────────────────────────────────────────────────────────
function flatten_(named) {
  const out = {};
  Object.keys(named || {}).forEach(k => { out[k.trim()] = String((named[k] || [''])[0]).trim(); });
  return out;
}
function firstName_(full) { return String(full || 'there').trim().split(/\s+/)[0]; }
function statusColumn_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const head = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let i = head.indexOf(STATUS_HEADER);
  if (i === -1) { sheet.getRange(1, lastCol + 1).setValue(STATUS_HEADER).setFontWeight('bold'); i = lastCol; }
  return i + 1;
}
function setStatus_(sheet, row, text) { sheet.getRange(row, statusColumn_(sheet)).setValue(text); }
function notifyMe_(subject, answers) {
  const lines = Object.keys(answers).map(k => `${k}: ${answers[k]}`).join('\n');
  GmailApp.sendEmail(CONFIG.YOUR_EMAIL, `[ClarityMetrics] ${subject}`, `${lines}\n\n${SpreadsheetApp.getActive().getUrl()}`);
}
function getRootFolder_() {
  const it = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
}


// ════════════════════════════════════════════════════════════════════════
// 4. AUTOMATIC SAMPLE DASHBOARDS (Claude API)
// ════════════════════════════════════════════════════════════════════════
//
// Flow, every 10 minutes (processSamples):
//   a. Find replies to the sample thank-you email that carry a data file (CSV, Excel, TSV, JSON, TXT).
//   b. Save the files to Drive → "ClarityMetrics Clients/Samples/<Business> — <date>".
//   c. Upload them to Claude and submit a background job (Message Batches API, so Apps Script's
//      60-second request limit never matters; batches also cost half the normal API price).
//   d. On a later run, collect the finished files: snapshot.pdf, dashboard.html, review.json.
//   e. Email you a review pack and create a Gmail draft reply to the prospect with the PDF attached.
//   f. When you send that draft, the Samples Status column flips to "Sent" automatically.

const AI = {
  API: 'https://api.anthropic.com/v1',
  VERSION: '2023-06-01',
  MODEL: 'claude-opus-5-5',          // best quality for client-facing work
  MAX_TOKENS: 32000,
  TOOL: { type: 'code_execution_20250825', name: 'code_execution' },
  MAX_CONTINUATIONS: 4,              // extra rounds if Claude needs more time on a big file
  GIVE_UP_AFTER_HOURS: 26,
};
const SAMPLE_SUBJECT_SEARCH = 'subject:"free ClarityMetrics sample report"';
const PROCESSED_LABEL = 'CM-sample-received';
const DATA_EXTENSIONS = ['csv', 'tsv', 'txt', 'xlsx', 'xls', 'xlsm', 'json'];

/** Trigger entry point (every 10 minutes). Also safe to run by hand. */
function processSamples() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    pickUpNewSampleFiles_();
    pollSampleJobs_();
    detectSentDrafts_();
  } finally {
    lock.releaseLock();
  }
}

/** Run by hand to test your API key. Logs "API key works" or the error. */
function testClaudeConnection() {
  const res = JSON.parse(api_('post', '/messages', {
    model: AI.MODEL, max_tokens: 20, messages: [{ role: 'user', content: 'Reply with: API key works' }],
  }).getContentText());
  Logger.log(res.content[0].text);
}

// ── a–c: new files in ───────────────────────────────────────────────────
function pickUpNewSampleFiles_() {
  const label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);
  const threads = GmailApp.search(`${SAMPLE_SUBJECT_SEARCH} has:attachment -label:${PROCESSED_LABEL} newer_than:30d`, 0, 10);

  threads.forEach(thread => {
    const msgs = thread.getMessages();
    const clientEmail = parseEmail_(msgs[0].getTo());
    const files = [];
    msgs.slice(1).forEach(m => m.getAttachments({ includeInlineImages: false }).forEach(a => {
      const ext = String(a.getName()).split('.').pop().toLowerCase();
      if (DATA_EXTENSIONS.includes(ext)) files.push(a.copyBlob().setName(a.getName()));
    }));
    if (!files.length) return;  // an image or signature only; keep waiting for a real file

    const lead = findSampleRow_(clientEmail);
    const business = lead.answers[CONFIG.Q.business] || clientEmail || 'Unknown business';
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const folder = subFolder_(subFolder_(getRootFolder_(), 'Samples'), `${business} — ${stamp}`);
    files.forEach(b => folder.createFile(b));

    try {
      const uploaded = files.map(b => uploadToClaude_(b));
      const job = {
        id: 'sample-' + Date.now(),
        threadId: thread.getId(),
        email: clientEmail,
        business: business,
        folderId: folder.getId(),
        uploaded: uploaded,
        fileNames: files.map(b => b.getName()),
        continuations: 0,
        startedAt: Date.now(),
      };
      const convo = { messages: [{ role: 'user', content: [{ type: 'text', text: buildDashboardPrompt_(lead.answers, job) }]
        .concat(uploaded.map(id => ({ type: 'container_upload', file_id: id }))) }], assistant: [] };
      saveConvo_(folder, convo);
      job.batchId = submitBatch_(job.id, convo.messages, null);
      job.state = 'building';
      putJob_(job);
      setSampleStatus_(clientEmail, 'File received — dashboard being built');
    } catch (err) {
      notifyProblem_(`Couldn't start the dashboard for ${business}`, err, folder);
      setSampleStatus_(clientEmail, 'File received — automatic build failed, see email');
    }
    thread.addLabel(label);
  });
}

function buildDashboardPrompt_(a, job) {
  const lines = Object.keys(a).filter(k => a[k] && k !== STATUS_HEADER && k !== 'Timestamp')
    .map(k => `- ${k}: ${a[k]}`).join('\n') || '- (no form answers found)';
  return [
    `You are the senior analyst and designer at ClarityMetrics, a small studio that turns small-business data into clear KPI dashboards. A prospect requested a free sample report and sent the attached file(s): ${job.fileNames.join(', ')}.`,
    '',
    'What they told us in the request form:',
    lines,
    '',
    'GOAL: the best possible one-page KPI snapshot of THEIR numbers, so good that they book a call to get it every week. Answer the question they asked, if they asked one, as the headline.',
    '',
    'HOW TO WORK',
    '1. Explore the files with Python (pandas). Identify the grain (orders, bookings, ad rows…), the date column and range, the money columns, and categories. Clean obvious issues (currency symbols, blank rows, duplicate rows, refunds/cancellations) and record every cleaning step.',
    '2. Choose the 4–6 KPIs that matter most for this business type (for example ecommerce: revenue, orders, AOV, repeat-customer rate, top products; agency/ads: spend, ROAS, CPL/CPA by channel; services: bookings, revenue per visit, rebooking rate, no-shows). Use only what the data supports.',
    '3. Compute every number in code. Compare the latest full period with the previous one (month over month, or week over week if under ~10 weeks of data). Never estimate or invent a figure; if something cannot be computed, leave it out and note why.',
    '4. Check your work: recompute each headline total a second way (for example sum of daily totals vs. raw sum) and make sure they match.',
    '',
    'DESIGN (ClarityMetrics brand): navy #0D2545, blue #185FA5, teal #0F6E56 for good, amber #854F0B for watch, red #A32D2D only for real problems, ink #1A1A18, muted #5F5E5A, light background #F8F7F4. Sans-serif type, generous white space, one accent colour per chart, direct labels instead of legends where possible, no 3D, no pie charts with more than 4 slices. Every chart has a title that states the finding (e.g. "Repeat customers drove 41% of revenue"), not just the topic.',
    'Layout: header (business name, "KPI Snapshot", date range covered, "Prepared by ClarityMetrics"); a row of KPI tiles (value + change vs. previous period, coloured up/down); 2–3 charts (a trend over time, a breakdown, top items); a short "What we found" section with 3 plain-English insights and "3 things to try"; a footer line with data notes (rows analysed, date range, anything excluded).',
    '',
    'DELIVERABLES: build everything in /tmp/work, then in ONE final command copy exactly these three files into $OUTPUT_DIR (only top-level files there are returned):',
    '- snapshot.pdf: ONE landscape page (11×8.5 in) made with matplotlib, polished enough to send to a prospect as is.',
    '- dashboard.html: a single self-contained page (inline CSS, charts as inline SVG generated by Python; no JavaScript libraries, no external fonts or requests) with the same content, responsive on a phone.',
    '- review.json with keys: "headline" (one sentence), "answer_to_their_question" (or null), "kpis" (list of {"name","value","change","period"}), "insights" (3 strings), "recommendations" (3 strings), "data_issues" (list), "assumptions" (list), "rows_analysed", "date_range", "confidence" ("high"|"medium"|"low" with reason), "client_email" (a warm, plain email under 120 words from Munjal to the prospect presenting the attached snapshot, naming the single most interesting finding, ending with an invitation to a 20-minute call to get this automatically every Monday; no subject line, no placeholders, sign off "Munjal").',
    '',
    'When finished, reply with one short paragraph summarising what you built. Do not ask questions; make sensible, stated assumptions.',
  ].join('\n');
}

// ── d: collect finished jobs ────────────────────────────────────────────
function pollSampleJobs_() {
  getJobs_().filter(j => j.state === 'building').forEach(job => {
    const folder = DriveApp.getFolderById(job.folderId);
    try {
      const batch = JSON.parse(api_('get', `/messages/batches/${job.batchId}`).getContentText());
      if (batch.processing_status !== 'ended') {
        if (Date.now() - job.startedAt > AI.GIVE_UP_AFTER_HOURS * 36e5) throw new Error('Timed out waiting for Claude.');
        return;
      }
      const result = batchResult_(batch, job.id);
      if (!result || result.type !== 'succeeded') throw new Error('Claude job did not succeed: ' + JSON.stringify(result).slice(0, 800));
      const msg = result.message;

      const convo = loadConvo_(folder);
      convo.assistant = convo.assistant.concat(msg.content);
      saveConvo_(folder, convo);

      if (msg.stop_reason === 'pause_turn' && job.continuations < AI.MAX_CONTINUATIONS) {
        const messages = convo.messages.concat([{ role: 'assistant', content: convo.assistant }]);
        job.batchId = submitBatch_(job.id, messages, msg.container && msg.container.id);
        job.continuations += 1;
        putJob_(job);
        return;
      }
      finishSample_(job, folder, convo.assistant);
    } catch (err) {
      job.state = 'failed';
      putJob_(job);
      notifyProblem_(`The automatic dashboard for ${job.business} failed`, err, folder);
      setSampleStatus_(job.email, 'Automatic build failed — see email');
    }
  });
}

function finishSample_(job, folder, assistantContent) {
  const ids = [];
  collectFileIds_(assistantContent, ids);
  const out = {};
  ids.filter(id => !job.uploaded.includes(id)).forEach(id => {
    const meta = JSON.parse(api_('get', `/files/${id}`).getContentText());
    const blob = api_('get', `/files/${id}/content`).getBlob().setName(meta.filename || id);
    folder.createFile(blob);
    out[(meta.filename || '').toLowerCase()] = blob;
  });
  const pdf = out['snapshot.pdf'];
  const html = out['dashboard.html'];
  if (!pdf && !html) throw new Error('Claude finished but returned no snapshot.pdf or dashboard.html.');

  let review = {};
  try { review = JSON.parse(out['review.json'].getDataAsString()); } catch (e) { review = {}; }

  // Draft reply to the prospect, waiting for your approval.
  const thread = GmailApp.getThreadById(job.threadId);
  const first = firstName_(findSampleRow_(job.email).answers[CONFIG.Q.name]);
  const clientBody = (review.client_email ||
    `Hi ${first},\n\nHere's your free KPI snapshot for ${job.business}, built from the file you sent. ${review.headline || ''}\n\nWould you like a report like this in your inbox every Monday, automatically? Book 20 minutes here and I'll walk you through it.\n\nMunjal`)
    + `\n\nBook a 20-minute call: ${CONFIG.BOOKING_LINK}\n\n${CONFIG.YOUR_NAME}\nClarityMetrics · ${CONFIG.WEBSITE}`;
  const draft = thread.createDraftReply(clientBody, {
    attachments: [pdf || html],
    name: `${CONFIG.YOUR_NAME} · ClarityMetrics`,
    replyTo: CONFIG.YOUR_EMAIL,
  });

  // Review pack for you.
  const list = (xs) => (xs && xs.length ? xs.map(x => `  • ${typeof x === 'string' ? x : JSON.stringify(x)}`).join('\n') : '  • none');
  const kpis = (review.kpis || []).map(k => `  • ${k.name}: ${k.value}${k.change ? ` (${k.change})` : ''}`).join('\n') || '  • see attachment';
  const body =
`A sample dashboard for ${job.business} is ready for your review.

HEADLINE
  ${review.headline || '(see attachment)'}
${review.answer_to_their_question ? `\nTHEIR QUESTION, ANSWERED\n  ${review.answer_to_their_question}\n` : ''}
KPIs
${kpis}

INSIGHTS
${list(review.insights)}

THINGS TO TRY
${list(review.recommendations)}

CHECK THESE BEFORE SENDING
  Data issues:
${list(review.data_issues)}
  Assumptions:
${list(review.assumptions)}
  Confidence: ${review.confidence || 'not stated'}
  Rows analysed: ${review.rows_analysed || '?'} · Date range: ${review.date_range || '?'}

TO APPROVE
  1. Open the attached snapshot.pdf (and dashboard.html in your browser for the interactive version).
  2. Open Gmail → Drafts → the reply to ${job.email}. Edit anything you like, then press Send.
  The Status column in your Sheet will change to "Sent" by itself.

Not happy with it? Delete the draft and adjust the files in the Drive folder:
${folder.getUrl()}`;

  GmailApp.sendEmail(CONFIG.YOUR_EMAIL, `[ClarityMetrics] Review: sample dashboard for ${job.business}`, body, {
    attachments: [pdf, html].filter(Boolean),
  });

  job.state = 'review';
  job.draftId = draft.getId();
  job.reviewAt = Date.now();
  putJob_(job);
  setSampleStatus_(job.email, 'Dashboard ready — waiting for your review (Gmail draft)');
}

// ── f: notice when you've sent the draft ────────────────────────────────
function detectSentDrafts_() {
  const draftIds = new Set(GmailApp.getDrafts().map(d => d.getId()));
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  getJobs_().forEach(job => {
    if (job.state !== 'review') {
      if (job.state === 'failed' && Date.now() - job.startedAt > 14 * 864e5) dropJob_(job.id);
      return;
    }
    if (draftIds.has(job.draftId)) return;  // still waiting for you
    const sent = GmailApp.getThreadById(job.threadId).getMessages().some(m =>
      m.getDate().getTime() > job.reviewAt && parseEmail_(m.getFrom()) === me && m.getAttachments().length > 0);
    if (sent) setSampleStatus_(job.email, 'Sent');
    else if (Date.now() - job.reviewAt < 14 * 864e5) return;  // draft deleted; keep watching a while
    dropJob_(job.id);
  });
}

// ── Claude API helpers ──────────────────────────────────────────────────
function apiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('No Claude API key. Add ANTHROPIC_API_KEY under Project Settings → Script properties.');
  return key;
}
function api_(method, path, body) {
  const options = { method: method, headers: { 'x-api-key': apiKey_(), 'anthropic-version': AI.VERSION }, muteHttpExceptions: true };
  if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  const res = UrlFetchApp.fetch(AI.API + path, options);
  if (res.getResponseCode() >= 300) throw new Error(`Claude API ${method.toUpperCase()} ${path} → ${res.getResponseCode()}: ${res.getContentText().slice(0, 600)}`);
  return res;
}
function uploadToClaude_(blob) {
  const res = UrlFetchApp.fetch(AI.API + '/files', {
    method: 'post',
    headers: { 'x-api-key': apiKey_(), 'anthropic-version': AI.VERSION },
    payload: { file: blob },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error(`Upload of ${blob.getName()} failed → ${res.getResponseCode()}: ${res.getContentText().slice(0, 600)}`);
  return JSON.parse(res.getContentText()).id;
}
function submitBatch_(customId, messages, containerId) {
  const params = { model: AI.MODEL, max_tokens: AI.MAX_TOKENS, tools: [AI.TOOL], messages: messages };
  if (containerId) params.container = containerId;
  const res = api_('post', '/messages/batches', { requests: [{ custom_id: customId, params: params }] });
  return JSON.parse(res.getContentText()).id;
}
function batchResult_(batch, customId) {
  const res = UrlFetchApp.fetch(batch.results_url, {
    headers: { 'x-api-key': apiKey_(), 'anthropic-version': AI.VERSION }, muteHttpExceptions: true,
  });
  const line = res.getContentText().split('\n').filter(Boolean).map(l => JSON.parse(l)).find(r => r.custom_id === customId);
  return line ? line.result : null;
}
function collectFileIds_(node, out) {
  if (Array.isArray(node)) return node.forEach(n => collectFileIds_(n, out));
  if (node && typeof node === 'object') {
    if (typeof node.file_id === 'string' && node.type !== 'container_upload' && !out.includes(node.file_id)) out.push(node.file_id);
    Object.keys(node).forEach(k => { if (node[k] && typeof node[k] === 'object') collectFileIds_(node[k], out); });
  }
}

// ── job + sheet helpers ─────────────────────────────────────────────────
function getJobs_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SAMPLE_JOBS') || '[]'); }
function saveJobs_(jobs) { PropertiesService.getScriptProperties().setProperty('SAMPLE_JOBS', JSON.stringify(jobs)); }
function putJob_(job) { saveJobs_(getJobs_().filter(j => j.id !== job.id).concat([job])); }
function dropJob_(id) { saveJobs_(getJobs_().filter(j => j.id !== id)); }

function saveConvo_(folder, convo) {
  const name = '_claude-conversation.json';
  const it = folder.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(JSON.stringify(convo));
  else folder.createFile(name, JSON.stringify(convo), 'application/json');
}
function loadConvo_(folder) {
  return JSON.parse(folder.getFilesByName('_claude-conversation.json').next().getBlob().getDataAsString());
}

function findSampleRow_(email) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Samples');
  const empty = { row: null, answers: {} };
  if (!sheet || !email || sheet.getLastRow() < 2) return empty;
  const data = sheet.getDataRange().getValues();
  const head = data[0].map(h => String(h).trim());
  const iEmail = head.indexOf(CONFIG.Q.email);
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][iEmail]).trim().toLowerCase() === email.toLowerCase()) {
      const answers = {};
      head.forEach((h, i) => { answers[h] = String(data[r][i]); });
      return { row: r + 1, answers: answers };
    }
  }
  return empty;
}
function setSampleStatus_(email, text) {
  const hit = findSampleRow_(email);
  if (!hit.row) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName('Samples');
  sheet.getRange(hit.row, statusColumn_(sheet)).setValue(text);
}
function parseEmail_(s) {
  const m = String(s || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(s || '').split(',')[0]).trim().toLowerCase();
}
function subFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function notifyProblem_(subject, err, folder) {
  GmailApp.sendEmail(CONFIG.YOUR_EMAIL, `[ClarityMetrics] ${subject}`,
    `${err && err.message ? err.message : err}\n\nThe prospect's file is saved here, so you can build the sample by hand:\n${folder ? folder.getUrl() : '(no folder)'}\n\nThe script will keep working on new requests.`);
}
