// Global Application State
let sessionToken = localStorage.getItem('pena_token');
let editingPenaId = null;
let selectedPhotoFiles = [];
let editorExistingPhotos = [];
let penaComments = [];

// Navigation History
let tabHistory = [];

// Feature States
let trucoState = { penaId: null, nosotros: [], ellos: [], puntosNos: 0, puntosEllos: 0 };
let gastosState = { penaId: null, expenses: [], participants: [], allParts: [], currentSplitSelection: [] };
let galleryState = { images: [], index: 0 };

// DOM Elements (Cached lazily or on init)
const app = document.getElementById('app');
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
