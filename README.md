# AI Risk Universe Visualization

An interactive, honeycomb-style visualization of AI risks, arranged in continuous "onion layers" by clustered processes. This project maps AI risk sub-processes into a tangible grid, providing a "Deep Dive" view into descriptions and sources.

**[View Live Demo](https://busera.github.io/AIRUM/)**

## features

- **Honeycomb Cluster**: Risks are packed nicely using a strict spiral algorithm to ensure no gaps.
- **Color Clustering**: Risks are sorted by Process ID (e.g., "1. Strategy") so related colors stay connected.
- **Interactive**:
    - **Pop & Zoom**: Hover over hexagons for tactile feedback.
    - **Filtering**: Use the top bar to filter by Process.
    - **Deep Dive**: Click any hexagon to open a full-screen detail card.

## Tech Stack

- **D3.js (v7)**: For SVG rendering and interactions.
- **SheetJS (xlsx)**: For parsing the Excel data file in the browser.
- **HTML5 / CSS3**: For layout and styling (Flexbox/Grid).

## Local Setup

This is a static site with no backend dependencies. However, due to browser security policies (CORS) regarding local file access (`file:///`), you need a local server to load the Excel file.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/ai-risk-universe.git
    cd ai-risk-universe
    ```

2.  **Start a local server**:
    If you have Python 3 installed:
    ```bash
    python3 -m http.server
    ```
    
    Or with Node.js:
    ```bash
    npx http-server
    ```

3.  **View**:
    Open your browser to `http://localhost:8000` (or the port shown in your terminal).

## Deployment

To deploy to GitHub Pages:

1.  Push this code to a GitHub repository.
2.  Go to **Settings > Pages**.
3.  Select the **main** branch as the source.
4.  Save. GitHub will provide your live URL.

## File Structure

```
/ (root)
├── index.html        # Main entry point
├── README.md         # Documentation
├── css/
│   └── styles.css    # Interactive styles
├── js/
│   └── main.js       # D3 logic & data parsing
├── data/
│   └── risk_matrix.xlsx # Source data
└── assets/
    └── ...           # Icons/Images
```
