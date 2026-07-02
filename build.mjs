import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import nunjucks from 'nunjucks';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TEMPLATE_DIR = path.join(ROOT, 'templates');
const OUTPUT_DIR = path.join(ROOT, 'output');

// Collaborator slug → display name mapping
const collaboratorsPath = path.join(ROOT, '..', 'Websites', 'sjtSite', 'src', 'data', 'collaborators.json');
let collaborators = {};
if (fs.existsSync(collaboratorsPath)) {
  collaborators = JSON.parse(fs.readFileSync(collaboratorsPath, 'utf8'));
}

// Also check for a local copy
const localCollabPath = path.join(ROOT, 'collaborators.json');
if (fs.existsSync(localCollabPath)) {
  collaborators = JSON.parse(fs.readFileSync(localCollabPath, 'utf8'));
}

function slugToName(slug) {
  if (collaborators[slug]) return collaborators[slug].name;
  // Fallback: title-case the slug
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Read a YAML file from data/
const DATA_DIR = path.join(ROOT, 'data');
function loadYaml(filename) {
  const filePath = path.join(DATA_DIR, filename);
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

// Escape LaTeX special characters
function texEscape(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// Recursively escape all string values in an object/array
function escapeData(data) {
  if (typeof data === 'string') return texEscape(data);
  if (Array.isArray(data)) return data.map(escapeData);
  if (data && typeof data === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = escapeData(v);
    }
    return out;
  }
  return data;
}

// Resolve collaborator/coauthor slugs to display names BEFORE escaping
function resolveCollaborators(data) {
  if (Array.isArray(data)) return data.map(resolveCollaborators);
  if (data && typeof data === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if ((k === 'collaborators' || k === 'coauthors') && Array.isArray(v)) {
        out[k] = v.map(slugToName);
      } else {
        out[k] = resolveCollaborators(v);
      }
    }
    return out;
  }
  return data;
}

// Load all data
let data = {
  appointments: loadYaml('appointments.yaml'),
  instituteVisits: loadYaml('institute-visits.yaml'),
  education: loadYaml('education.yaml'),
  publications: loadYaml('publications.yaml'),
  inProgress: loadYaml('in-progress.yaml'),
  exhibitions: loadYaml('exhibitions.yaml'),
  featuredWork: loadYaml('featured-work.yaml'),
  courseNotes: loadYaml('course-notes.yaml'),
  teaching: loadYaml('teaching.yaml'),
  colloquia: loadYaml('colloquia.yaml'),
  publicLectures: loadYaml('public-lectures.yaml'),
  researchTalks: loadYaml('research-talks.yaml'),
  service: loadYaml('service.yaml'),
  mentoring: loadYaml('mentoring.yaml'),
  refereeing: loadYaml('refereeing.yaml'),
  awards: loadYaml('awards.yaml'),
  software: loadYaml('software.yaml'),
  languages: loadYaml('languages.yaml'),
};

// Resolve slugs → names, then escape for LaTeX
data = resolveCollaborators(data);
data = escapeData(data);

// Configure Nunjucks with custom delimiters to avoid LaTeX brace conflicts
const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(TEMPLATE_DIR),
  { autoescape: false, tags: {
    blockStart: '<%',
    blockEnd: '%>',
    variableStart: '<<',
    variableEnd: '>>',
    commentStart: '<#',
    commentEnd: '#>',
  }}
);

// Render
const tex = env.render('cv.tex.njk', data);

// Write output
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const outPath = path.join(OUTPUT_DIR, 'cv.tex');
fs.writeFileSync(outPath, tex);
console.log(`Generated ${outPath}`);
