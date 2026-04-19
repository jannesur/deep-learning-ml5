const EXAMPLE_ITEMS = [
    {
        title: "1) Hund",
        source: "./assets/hund.jpg",
        expectedLabel: "Hund",
        expectedKeywords: ["dog", "retriever", "terrier", "labrador", "shepherd"]
    },
    {
        title: "2) Lampe",
        source: "./assets/lampe.jpg",
        expectedLabel: "Lampe",
        expectedKeywords: ["lamp", "lampshade", "table lamp", "desk lamp"]
    },
    {
        title: "3) Banane",
        source: "./assets/banane.jpg",
        expectedLabel: "Banane",
        expectedKeywords: ["banana", "plantain"]
    }
];

const listNode = document.getElementById("correct-list");
const chartMap = new Map();

createCards();

const classifier = ml5.imageClassifier("MobileNet", modelLoaded);

function modelLoaded() {
    EXAMPLE_ITEMS.forEach((_, index) => classifyWhenReady(index));
}

function classifyWhenReady(index) {
    const imageEl = document.getElementById(`image-${index}`);

    if (imageEl.complete && imageEl.naturalWidth > 0) {
        classifyExample(index);
        return;
    }

    imageEl.onload = () => classifyExample(index);
    imageEl.onerror = () => {
        setResult(index, "-", "Nicht korrekt klassifiziert (Bildfehler)", false);
    };
}

function classifyExample(index) {
    const item = EXAMPLE_ITEMS[index];
    const imageEl = document.getElementById(`image-${index}`);

    classifier.classify(imageEl, 5, (err, results) => {
        if (err) {
            setResult(index, "-", "Nicht korrekt klassifiziert (Fehler)", false);
            return;
        }

        if (!Array.isArray(results) || results.length === 0) {
            setResult(index, "-", "Nicht korrekt klassifiziert", false);
            return;
        }

        const top = results[0];
        const topLabel = (top.label || "Unbekannt").split(",")[0];
        const confidencePct = ((top.confidence || 0) * 100).toFixed(1);

        const isCorrect = isExpectedMatch(results, item.expectedKeywords);

        setResult(
            index,
            `${topLabel} (${confidencePct} %)`,
            isCorrect ? "Korrekt klassifiziert" : "Nicht korrekt klassifiziert",
            isCorrect
        );

        renderChart(index, results.slice(0, 5));
    });
}

function isExpectedMatch(results, keywords) {
    return results.slice(0, 3).some((r) => {
        const label = (r.label || "").toLowerCase();
        return keywords.some((kw) => label.includes(kw));
    });
}

function setResult(index, classifiedValue, resultValue, isCorrect) {
    const classifiedNode = document.getElementById(`classified-${index}`);
    const resultNode = document.getElementById(`result-${index}`);

    classifiedNode.textContent = `Klassifiziert: ${classifiedValue}`;
    resultNode.textContent = `Ergebnis: ${resultValue}`;
    resultNode.className = isCorrect ? "result-ok" : "result-bad";
}

function createCards() {
    EXAMPLE_ITEMS.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "row-card";

        card.innerHTML = `
            <div class="card-title-row">
                <h3>${item.title}</h3>
            </div>

            <div class="media-left">
                <img id="image-${index}" class="preview" src="${item.source}" alt="${item.title}">
            </div>

            <div class="media-right">
                <canvas id="chart-${index}"></canvas>
            </div>

            <div class="info-row">
                <p>Erwartetes Objekt: ${item.expectedLabel}</p>
                <p>Erlaubte Begriffe: ${item.expectedKeywords.join(", ")}</p>
                <p id="classified-${index}">Klassifiziert: ...</p>
                <p id="result-${index}">Ergebnis: ...</p>
            </div>
        `;

        listNode.appendChild(card);
    });
}

function renderChart(index, results) {
    const canvas = document.getElementById(`chart-${index}`);

    const labels = results.map((r) => {
        const shortLabel = (r.label || "Unbekannt").split(",")[0];
        const pct = ((r.confidence || 0) * 100).toFixed(1);
        return `${shortLabel} (${pct}%)`;
    });

    const data = results.map((r) => Number((r.confidence * 100).toFixed(2)));

    const oldChart = chartMap.get(index);
    if (oldChart) oldChart.destroy();

    const chart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: ["#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a", "#334155"]
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { min: 0, max: 100 }
            }
        }
    });

    chartMap.set(index, chart);
}