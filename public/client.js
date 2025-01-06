// === Element Selection ===

// Buttons
const deduplicateBtn = document.getElementById('deduplicateBtn');
const startBtn = document.getElementById('startBtn');
const loadResultsBtn = document.getElementById('loadResultsBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn'); // New Button
const toggleDarkBtn = document.getElementById('toggleDarkBtn');
const pairingOptions = document.getElementById('pairingOptions');

// Containers
const compareContainer = document.getElementById('compareContainer');
const resultsContainer = document.getElementById('resultsContainer');
const leaderboardContainer = document.getElementById('leaderboardContainer');

// Display Elements
const comparisonCountDisplay = document.getElementById('comparisonCount');

// === Data Storage ===

let images = [];
let imageRatings = {};
let imageData = {};
let imageStats = {}; // Track stats for each image
let comparisonCount = 0;
const K = 32;

// Pairing methods
let pairingMethod = 'random';
let imageQueue = [];
let hybridPairs = []; // Track unique pairs for hybrid mode

// Flag to Prevent Multiple Finalizations
let isFinalizing = false;

// === Persistent Storage Functions ===

function saveEloRatings() {
  const combinedData = Object.entries(imageRatings).map(([image, rating]) => {
    const stats = imageStats[image] || { selections: 0, wins: 0, losses: 0 };
    return {
      image,
      rating,
      ...stats,
    };
  });
  console.log('Saving Elo Data:', combinedData); // Debugging
  localStorage.setItem('eloData', JSON.stringify(combinedData));
}

function loadEloRatings() {
  const storedData = localStorage.getItem('eloData');
  if (storedData) {
    const combinedData = JSON.parse(storedData);
    imageRatings = {};
    imageStats = {};
    combinedData.forEach(({ image, rating, selections, wins, losses }) => {
      imageRatings[image] = rating;
      imageStats[image] = { selections, wins, losses };
    });
    console.log('Loaded Elo Data:', { imageRatings, imageStats }); // Debugging
    resultsContainer.innerHTML = 'Elo data loaded from local storage.';
  } else {
    imageRatings = {};
    imageStats = {};
    resultsContainer.innerHTML = 'No saved Elo data found in local storage.';
  }
}


// Save Comparison Count
function saveComparisonCount() {
  localStorage.setItem('comparisonCount', comparisonCount);
}

// Load Comparison Count
function loadComparisonCount() {
  const storedCount = localStorage.getItem('comparisonCount');
  if (storedCount) {
    comparisonCount = parseInt(storedCount, 10);
    comparisonCountDisplay.textContent = `Comparisons: ${comparisonCount}`;
  }
}

// === User Feedback Functions ===

// Show Loading Message
function showLoading(message = 'Loading...') {
  resultsContainer.innerHTML = `<p>${message}</p>`;
}

// Show Confirmation Message
function showConfirmation(message) {
  resultsContainer.innerHTML = `<p>${message}</p>`;
}

// === Reset Session Function ===
function resetSession() {
  // Clear stored Elo Ratings and Comparison Count
  localStorage.removeItem('eloData');
  localStorage.removeItem('comparisonCount');

  // Reset in-memory data
  images = [];
  imageRatings = {};
  imageStats = {};
  comparisonCount = 0;
  hybridPairs = [];
  imageQueue = [];
  //pairingMethod = 'random';

  // Update UI
  comparisonCountDisplay.textContent = `Comparisons: ${comparisonCount}`;
  resultsContainer.innerHTML = '<p>Session has been reset.</p>';
  leaderboardContainer.innerHTML = '<p>Leaderboard will update after new comparisons.</p>';
  compareContainer.innerHTML = '';

  console.log('Session reset successfully.');
}


// === Event Listeners ===

// Reset Session Button Click
resetSessionBtn.addEventListener('click', () => {
  const confirmReset = confirm('Are you sure you want to reset the session? All progress will be lost.');
  if (confirmReset) resetSession();
});

// Deduplicate Button Click
deduplicateBtn.addEventListener('click', async () => {
  showLoading('Removing duplicates...');
  try {
    const res = await fetch('/api/deduplicate', { method: 'POST' });
    if (!res.ok) {
      resultsContainer.innerHTML = `Error during deduplication: ${res.statusText}`;
      return;
    }
    const data = await res.json();
    showConfirmation(`Deduplication complete. Duplicates removed: ${data.duplicatesRemoved}`);
  } catch (error) {
    resultsContainer.innerHTML = `Error during deduplication: ${error.message}`;
  }
});

loadResultsBtn.addEventListener('click', async () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading('Loading Elo data from file...');
    try {
      const text = await file.text();
      const combinedData = JSON.parse(text);
      imageRatings = {};
      imageStats = {};
      combinedData.forEach(({ image, rating, selections, wins, losses }) => {
        imageRatings[image] = rating;
        imageStats[image] = { selections, wins, losses };
      });
      saveEloRatings();
      showConfirmation('Elo data loaded successfully from file.');
      updateLeaderboard();
    } catch (error) {
      resultsContainer.innerHTML = `Error loading data: ${error.message}`;
    }
  };
  fileInput.click();
});

// Start Button Click
startBtn.addEventListener('click', startEloRanking);

// Download Button Click
downloadBtn.addEventListener('click', () => {
  const combinedData = Object.entries(imageRatings).map(([image, rating]) => {
    const stats = imageStats[image] || { selections: 0, wins: 0, losses: 0 };
    return {
      image,
      rating,
      ...stats,
    };
  });
  const dataToDownload = JSON.stringify(combinedData, null, 2);
  console.log('Exporting Data:', combinedData); // Debugging
  const blob = new Blob([dataToDownload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'eloRatings.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showConfirmation('Elo data has been downloaded successfully.');
});

// Toggle Dark Mode Button Click
toggleDarkBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  toggleDarkBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
});

// Setting Pairing Method Default on page load
document.addEventListener('DOMContentLoaded', () => {
  pairingMethod = pairingOptions.value; // Default to the dropdown's initial value
  console.log('Default Pairing Method:', pairingMethod);
});

// Setting Pairing Method
pairingOptions.addEventListener('change', (e) => {
  pairingMethod = e.target.value; // Set the pairing method to the selected value
  console.log('Pairing Method Updated:', pairingMethod); // Debugging
});


// === Elo Ranking Functions ===

async function startEloRanking() {
  showLoading('Fetching images...');
  try {
    const res = await fetch('/api/images');
    if (!res.ok) {
      resultsContainer.innerHTML = `Error fetching images: ${res.statusText}`;
      return;
    }

    images = await res.json();
    if (!images.length) {
      resultsContainer.innerHTML = 'No images found.';
      return;
    }

    console.log('Images fetched for ranking:', images);

    // Initialize Elo Ratings and Stats if Empty
    if (Object.keys(imageRatings).length === 0) {
      images.forEach((img) => {
        imageRatings[img] = 1500;
        imageStats[img] = { selections: 0, wins: 0, losses: 0 };
      });
    } else {
      // Ensure missing images are added
      images.forEach((img) => {
        if (!(img in imageRatings)) {
          imageRatings[img] = 1500;
        }
        if (!(img in imageStats)) {
          imageStats[img] = { selections: 0, wins: 0, losses: 0 };
        }
      });
    }

    console.log('Initialized imageRatings:', imageRatings);
    console.log('Initialized imageStats:', imageStats);

    saveEloRatings();

    // Reset Comparison Count
    comparisonCount = 0;
    saveComparisonCount();
    comparisonCountDisplay.textContent = `Comparisons: ${comparisonCount}`;

    if (pairingMethod === 'hybrid') {
      hybridPairs = generateHybridPairs();
      console.log('Generated Hybrid Pairs:', hybridPairs);
    } else if (pairingMethod === 'targeted') {
      imageQueue = getTargetedPairs();
      console.log('Generated Targeted Pairs:', imageQueue);
    }

    resultsContainer.innerHTML = `
      <p>Starting Elo ranking with ${images.length} images.</p>
    `;

    // Initialize Leaderboard
    updateLeaderboard();

    showNextPair();
  } catch (error) {
    console.error('Error in startEloRanking:', error);
    resultsContainer.innerHTML = `Error fetching images: ${error.message}`;
  }
}


function generateHybridPairs() {
  const shuffledImages = [...images];
  shuffleArray(shuffledImages); // Shuffle images randomly

  const pairs = [];
  for (let i = 0; i < shuffledImages.length; i += 2) {
    if (i + 1 < shuffledImages.length) {
      pairs.push([shuffledImages[i], shuffledImages[i + 1]]);
    }
  }

  console.log('Generated Hybrid Pairs for Phase 1:', pairs);
  return pairs;
}

function showNextPair() {
  compareContainer.innerHTML = ''; // Clear previous images

  let leftImgUrl, rightImgUrl;

  switch (pairingMethod) {
    case 'random':
      // Pick a random pair
      [leftImgUrl, rightImgUrl] = pickRandomPair();
      break;

    case 'hybrid':
      if (hybridPairs.length === 0) {
        console.log('Phase 1 of Hybrid mode completed. Transitioning to Targeted mode.');
        pairingMethod = 'targeted'; // Transition to Targeted mode
        imageQueue = getTargetedPairs(); // Generate Targeted pairs
        showNextPair(); // Recursively show next pair in Targeted mode
        return;
      } else {
        // Retrieve the next pair from hybridPairs
        const nextHybridPair = hybridPairs.shift();
        [leftImgUrl, rightImgUrl] = nextHybridPair;
        console.log('Next Hybrid Pair:', nextHybridPair);
      }
      break;

    case 'targeted':
      if (imageQueue.length < 1) {
        imageQueue = getTargetedPairs();
      }
      const nextTargetedPair = imageQueue.shift();
      if (nextTargetedPair) {
        [leftImgUrl, rightImgUrl] = nextTargetedPair;
        console.log('Next Targeted Pair:', nextTargetedPair);
      } else {
        resultsContainer.innerHTML = 'All targeted pairs have been compared.';
        return;
      }
      break;

    default:
      console.error('Unknown pairing method:', pairingMethod);
      return;
  }

  console.log('Image Stats at ShowNextPair:', { leftImgUrl, rightImgUrl, stats: imageStats });

  // Display the pair
  displayImages(leftImgUrl, rightImgUrl);
}

function pickRandomPair() {
  const left = images[Math.floor(Math.random() * images.length)];
  let right = images[Math.floor(Math.random() * images.length)];

  while (left === right) {
    right = images[Math.floor(Math.random() * images.length)];
  }

  return [left, right];
}

function getTargetedPairs() {
  const pairs = [];
  const sortedImages = Object.entries(imageRatings)
    .sort((a, b) => b[1] - a[1]) // Sort descending by Elo rating
    .map(([key]) => key);

  for (let i = 0; i < sortedImages.length - 1; i++) {
    pairs.push([sortedImages[i], sortedImages[i + 1]]);
  }

  shuffleArray(pairs); // Shuffle the pairs randomly
  console.log('Generated Targeted Pairs:', pairs);
  return pairs;
}


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// === Display Images Function with Enhanced Features ===

function displayImages(leftImg, rightImg) {
  console.log('Displaying images:', leftImg, rightImg);

  // Create Image Elements with Lazy Loading and ARIA Labels
  const leftImgEl = document.createElement('img');
  leftImgEl.src = leftImg;
  leftImgEl.alt = 'Left Image for Comparison';
  leftImgEl.loading = 'lazy';
  leftImgEl.classList.add('selectable-image');

  const rightImgEl = document.createElement('img');
  rightImgEl.src = rightImg;
  rightImgEl.alt = 'Right Image for Comparison';
  rightImgEl.loading = 'lazy';
  rightImgEl.classList.add('selectable-image');

  // Append Stats Below Each Image
  const leftStats = document.createElement('p');
  leftStats.textContent = `Elo: ${imageRatings[leftImg] || 1500}, Selections: ${imageStats[leftImg]?.selections || 0}, Wins: ${imageStats[leftImg]?.wins || 0}, Losses: ${imageStats[leftImg]?.losses || 0}`;

  const rightStats = document.createElement('p');
  rightStats.textContent = `Elo: ${imageRatings[rightImg] || 1500}, Selections: ${imageStats[rightImg]?.selections || 0}, Wins: ${imageStats[rightImg]?.wins || 0}, Losses: ${imageStats[rightImg]?.losses || 0}`;

  const leftContainer = document.createElement('div');
  leftContainer.appendChild(leftImgEl);
  leftContainer.appendChild(leftStats);

  const rightContainer = document.createElement('div');
  rightContainer.appendChild(rightImgEl);
  rightContainer.appendChild(rightStats);

  // Append Containers to Compare Container
  compareContainer.appendChild(leftContainer);
  compareContainer.appendChild(rightContainer);

  // (Retain existing keypress and click handling logic...)

  // Debounce Function to Prevent Rapid Keypresses
  let debounceTimeout;
  const debounceDelay = 200; // milliseconds

  // Define Key Handler with Debouncing
  const keyHandler = (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (isFinalizing) return; // Prevent if already finalizing

      if (e.key === '1') {
        finalizeChoice(leftImg, rightImg);
      } else if (e.key === '2') {
        finalizeChoice(rightImg, leftImg);
      }
    }, debounceDelay);
  };

  // Attach Keydown Event Listener
  window.addEventListener('keydown', keyHandler);
  console.log('Key handler added.');

  // Define Click Handlers
  const handleLeftClick = () => finalizeChoice(leftImg, rightImg);
  const handleRightClick = () => finalizeChoice(rightImg, leftImg);

  // Attach Click Event Listeners
  leftImgEl.addEventListener('click', handleLeftClick);
  rightImgEl.addEventListener('click', handleRightClick);

  // Finalize Choice Function
  function finalizeChoice(winner, loser) {
    if (isFinalizing) {
      console.log('FinalizeChoice is already in progress.');
      return; // Prevent multiple executions
    }

    isFinalizing = true; // Set the flag
    console.log(`Finalizing choice: Winner - ${winner}, Loser - ${loser}`);

    // Remove Event Listeners
    window.removeEventListener('keydown', keyHandler);
    console.log('Key handler removed.');

    leftImgEl.removeEventListener('click', handleLeftClick);
    rightImgEl.removeEventListener('click', handleRightClick);

    // Update Elo Ratings
    updateElo(winner, loser);

    // Update Comparison Count
    comparisonCount++;
    comparisonCountDisplay.textContent = `Comparisons: ${comparisonCount}`;
    saveComparisonCount();

    // Update Leaderboard
    updateLeaderboard();

    // Show Next Pair
    showNextPair();

    isFinalizing = false; // Reset the flag
  }
}

function updateElo(winner, loser) {
  if (!(winner in imageRatings) || !(loser in imageRatings)) {
    console.error('Winner or loser not found in imageRatings.');
    return;
  }

  // Update stats
  imageStats[winner].selections++;
  imageStats[winner].wins++;
  imageStats[loser].selections++;
  imageStats[loser].losses++;

  // Debugging: Log stats after update
  console.log('Updated Stats:', imageStats);

  // Calculate ELO
  const Rw = imageRatings[winner];
  const Rl = imageRatings[loser];
  const Ew = 1 / (1 + Math.pow(10, (Rl - Rw) / 400));
  imageRatings[winner] = Rw + K * (1 - Ew);
  imageRatings[loser] = Rl + K * (0 - (1 - Ew));

  // Debugging: Log ratings after update
  console.log('Updated Ratings:', imageRatings);

  saveEloRatings(); // Persist changes
}




// === Leaderboard Functions ===

// Function to Update Leaderboard
function updateLeaderboard() {
  // Clear existing leaderboard
  leaderboardContainer.innerHTML = '';

  // Debug current ratings
  console.log('Current Image Ratings:', imageRatings);

  // Create a sorted array of images based on Elo ratings (descending order)
  const sortedImages = Object.entries(imageRatings)
    .sort((a, b) => b[1] - a[1]) // Sort descending
    .slice(0, 5); // Top 5

  // Debug sorted images
  console.log('Sorted Images for Leaderboard:', sortedImages);

  if (!sortedImages || sortedImages.length === 0) {
    console.error('No valid entries found in sortedImages:', imageRatings);
    leaderboardContainer.innerHTML = '<p>No data available for leaderboard.</p>';
    return;
  }

  // Create leaderboard title
  const leaderboardTitle = document.createElement('h2');
  leaderboardTitle.textContent = 'Top 5 Images';
  leaderboardContainer.appendChild(leaderboardTitle);

  // Create leaderboard container
  const leaderboardList = document.createElement('div');
  leaderboardList.style.display = 'flex';
  leaderboardList.style.justifyContent = 'center';
  leaderboardList.style.gap = '1rem';

  sortedImages.forEach(([image, rating], index) => {
    const container = document.createElement('div');
    container.style.textAlign = 'center';

    const img = document.createElement('img');
    img.src = image;
    img.alt = `Rank ${index + 1}`;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';

    const rank = document.createElement('p');
    rank.textContent = `Rank ${index + 1}: ${rating.toFixed(2)}`;
    rank.style.marginTop = '0.5rem';
    rank.style.fontWeight = 'bold';

    // Include Stats Below the Image
    const stats = document.createElement('p');
    const statDetails = imageStats[image] || { selections: 0, wins: 0, losses: 0 };
    stats.textContent = `S: ${statDetails.selections}, W: ${statDetails.wins}, L: ${statDetails.losses}`;
    stats.style.fontSize = '0.9rem';

    container.appendChild(img);
    container.appendChild(rank);
    container.appendChild(stats);

    leaderboardList.appendChild(container);
  });

  leaderboardContainer.appendChild(leaderboardList);
}



// === Initialize Application ===

// Load Elo Ratings and Comparison Count from localStorage on Page Load
window.addEventListener('load', () => {
  loadEloRatings();
  loadComparisonCount();
  updateLeaderboard();
});
