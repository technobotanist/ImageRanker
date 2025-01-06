---

# **Image Comparison and Ranking Application**

A web-based application for comparing and ranking images using an Elo-based scoring system. Supports multiple pairing modes, dynamic leaderboards, and detailed image statistics. Features include session resets, progress saving/loading, and deduplication functionality to streamline image datasets.

---

## **Features**
- **Pairing Modes**:
  - **Random**: Randomly selects image pairs for comparison.
  - **Hybrid**: A two-phase process:
    - **Phase 1**: Each image is compared exactly once in randomized pairs.
    - **Phase 2**: Transitions to Targeted mode for refined comparisons.
  - **Targeted**: Focuses on comparing images with similar Elo scores for precise ranking adjustments.
- **Deduplication**: Automatically detects and removes duplicate images from the dataset.
- **Leaderboard**: Displays top-ranked images along with statistics like selections, wins, and losses.
- **Save/Load Progress**: Export and import session data as JSON files.
- **User-Friendly Interface**: Includes keyboard shortcuts, dark mode, and responsive design.

---

## **Installation**

### **System Requirements**
- **Browser**: Modern web browser (e.g., Chrome, Firefox, Edge, Safari).
- **Server**: Node.js installed (version 14+ recommended).

### **Setup Steps**
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/<your-repo>/ImageRanker.git
   cd ImageRanker
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   node server.js
   ```

4. **Access the Application**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## **Usage**

### **1. Upload Images**
- Ensure your images are uploaded to the server or accessible via the `/api/images` endpoint.

### **2. Select a Pairing Mode**
- Use the dropdown menu labeled **"Pairing Options"** to choose:
  - **Random**: Randomly pairs images for comparison.
  - **Hybrid**: Compares all images exactly once before transitioning to Targeted mode.
  - **Targeted**: Compares images with the most similar Elo scores.

### **3. Start Elo Rankings**
- Click the **Start** button to begin.
- Two images will be displayed for comparison.

### **4. Compare Images**
- Click on the preferred image or use the keyboard shortcuts:
  - **1**: Select the left image.
  - **2**: Select the right image.

### **5. Deduplicate Images**
- Click the **Deduplicate** button to remove duplicate images from the dataset. A confirmation message will indicate how many duplicates were removed.

### **6. Monitor Leaderboard**
- The leaderboard dynamically updates to show:
  - **Rank**: Image’s position based on Elo score.
  - **Elo Score**: Current score.
  - **Statistics**: Selections, Wins, Losses.

### **7. Save/Load Progress**
- **Save**: Use the **Download** button to export progress as a JSON file.
- **Load**: Use the **Load Results** button to import previously saved sessions.

---

## **Modes Overview**

### **Random Mode**
- Images are randomly paired without any specific strategy.
- Best suited for exploratory comparisons or initial ranking.

### **Hybrid Mode**
- Combines breadth and precision in a two-phase process:
  - **Phase 1**: All images are compared once in randomized pairs.
  - **Phase 2**: Automatically transitions to Targeted mode for refined comparisons.

### **Targeted Mode**
- Focuses on comparing images with similar Elo scores.
- Ideal for fine-tuning rankings.

---

## **Deduplication Process**
- Automatically detects duplicate images based on file content or metadata.
- Removes duplicates from the dataset while retaining one instance of each unique image.
- Helps streamline comparisons and improve ranking efficiency.

---

## **Keyboard Shortcuts**
- **1**: Select the left image.
- **2**: Select the right image.

---

## **Troubleshooting**

### **Common Issues**
1. **Server Not Starting**:
   - Ensure Node.js is installed and use `node server.js` to start the server.
2. **Images Not Displaying**:
   - Verify images are uploaded to the correct directory or accessible via `/api/images`.
3. **Leaderboard Not Updating**:
   - Ensure comparisons are made, and check the browser console for errors.

---

## **Contributing**
Pull requests and suggestions are welcome! For major changes, please open an issue to discuss what you’d like to change.

---

## **License**
This project is licensed under the MIT License.

---
