const exampleItems = [
    {
        title: "1) Hund",
        imageSource: "./assets/hund.jpg",
        expectedLabel: "Hund",
        expectedKeywords: ["dog", "retriever", "terrier", "labrador", "shepherd"],
        group: "correct"
    },
    {
        title: "2) Lampe",
        imageSource: "./assets/lampe.jpg",
        expectedLabel: "Lampe",
        expectedKeywords: ["lamp", "lampshade", "table lamp", "desk lamp"],
        group: "correct"
    },
    {
        title: "3) Banane",
        imageSource: "./assets/banane.jpg",
        expectedLabel: "Banane",
        expectedKeywords: ["banana", "plantain"],
        group: "correct"
    },
    {
        title: "1) Hund",
        imageSource: "./assets/hund2.jpg",
        expectedLabel: "Hund",
        expectedKeywords: ["dog", "retriever", "terrier", "labrador", "shepherd"],
        group: "wrong"
    },
    {
        title: "2) Lampe",
        imageSource: "./assets/lampe2.jpg",
        expectedLabel: "Lampe",
        expectedKeywords: ["lamp", "lampshade", "table lamp", "desk lamp"],
        group: "wrong"
    },
    {
        title: "3) Banane",
        imageSource: "./assets/banane2.jpg",
        expectedLabel: "Banane",
        expectedKeywords: ["banana", "plantain"],
        group: "wrong"
    }
];

const allowedFileTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const correctExamplesContainer = document.getElementById("correct-list");
const wrongExamplesContainer = document.getElementById("wrong-list");

const chartsForExampleImages = new Map();

const userFileInput = document.getElementById("user-file");
const userFileButton = document.getElementById("user-file-trigger");
const userFileNameText = document.getElementById("user-file-name");
const userImagePreview = document.getElementById("user-preview");
const userClassifyButton = document.getElementById("user-classify-btn");
const userDropZone = document.getElementById("drop-zone");
const userClassificationText = document.getElementById("user-classified");
const userChartCanvas = document.getElementById("user-chart");

let modelIsReady = false;
let currentUserImageUrl = null;
let userChart = null;

createExampleCards();
setupUserImageUpload();

const imageClassifier = ml5.imageClassifier("MobileNet", onModelLoaded);

// Wird aufgerufen, wenn das Modell geladen ist
function onModelLoaded() {
    modelIsReady = true;
    updateUserClassifyButton();

    exampleItems.forEach(function (exampleItem, exampleIndex) {
        classifyExampleImageWhenReady(exampleIndex);
    });
}

// Wartet bis das Beispielbild geladen ist und klassifiziert es dann
function classifyExampleImageWhenReady(exampleIndex) {
    const exampleImageElement = document.getElementById("image-" + exampleIndex);

    if (exampleImageElement.complete && exampleImageElement.naturalWidth > 0) {
        classifyExampleImage(exampleIndex);
        return;
    }

    exampleImageElement.onload = function () {
        classifyExampleImage(exampleIndex);
    };

    exampleImageElement.onerror = function () {
        showExampleClassification(exampleIndex, "Fehler beim Laden des Bildes", false);
    };
}

// Klassifiziert ein Beispielbild mit MobileNet
function classifyExampleImage(exampleIndex) {
    const exampleItem = exampleItems[exampleIndex];
    const exampleImageElement = document.getElementById("image-" + exampleIndex);

    imageClassifier.classify(exampleImageElement, 5, function (error, classificationResults) {
        if (error || !Array.isArray(classificationResults) || classificationResults.length === 0) {
            showExampleClassification(exampleIndex, "Fehler bei der Klassifikation", false);
            return;
        }

        const bestResult = classificationResults[0];
        const bestLabel = (bestResult.label || "Unbekannt").split(",")[0];
        const bestConfidencePercent = ((bestResult.confidence || 0) * 100).toFixed(1);

        const expectedObjectWasFound = checkIfExpectedObjectWasFound(
            classificationResults,
            exampleItem.expectedKeywords
        );

        showExampleClassification(
            exampleIndex,
            bestLabel + " (" + bestConfidencePercent + " %)",
            expectedObjectWasFound
        );

        renderExampleChart(exampleIndex, classificationResults.slice(0, 5));
    });
}

// Prüft, ob das erwartete Objekt in den ersten drei Ergebnissen vorkommt
function checkIfExpectedObjectWasFound(classificationResults, expectedKeywords) {
    const firstThreeResults = classificationResults.slice(0, 3);

    return firstThreeResults.some(function (classificationResult) {
        const labelText = (classificationResult.label || "").toLowerCase();

        return expectedKeywords.some(function (expectedKeyword) {
            return labelText.includes(expectedKeyword);
        });
    });
}

// Zeigt das Klassifikationsergebnis eines Beispielbildes an
function showExampleClassification(exampleIndex, classificationText, isCorrectClassification) {
    const classificationTextElement = document.getElementById("classified-" + exampleIndex);

    classificationTextElement.textContent = "Klassifiziert: " + classificationText;

    if (isCorrectClassification) {
        classificationTextElement.className = "classified-text classified-ok";
    } else {
        classificationTextElement.className = "classified-text classified-bad";
    }
}

// Erstellt die Karten für alle Beispielbilder
function createExampleCards() {
    exampleItems.forEach(function (exampleItem, exampleIndex) {
        const cardElement = document.createElement("article");
        cardElement.className = "row-card";

        cardElement.innerHTML = `
            <div class="card-title-row">
                <h3>${exampleItem.title}</h3>
            </div>

            <div class="media-left">
                <img id="image-${exampleIndex}" class="preview" src="${exampleItem.imageSource}" alt="${exampleItem.title}">
            </div>

            <div class="media-right">
                <canvas id="chart-${exampleIndex}"></canvas>
            </div>

            <div class="info-row">
                <p>Erwartetes Objekt: ${exampleItem.expectedLabel}</p>
                <p id="classified-${exampleIndex}" class="classified-text">Klassifiziert: ...</p>
            </div>
        `;

        if (exampleItem.group === "correct") {
            correctExamplesContainer.appendChild(cardElement);
        } else {
            wrongExamplesContainer.appendChild(cardElement);
        }
    });
}

// Erstellt ein Diagramm für ein Beispielbild
function renderExampleChart(exampleIndex, classificationResults) {
    const chartCanvas = document.getElementById("chart-" + exampleIndex);

    const chartLabels = classificationResults.map(function (classificationResult) {
        return (classificationResult.label || "Unbekannt").split(",")[0];
    });

    const chartValues = classificationResults.map(function (classificationResult) {
        return Number((classificationResult.confidence * 100).toFixed(2));
    });

    const oldChart = chartsForExampleImages.get(exampleIndex);

    if (oldChart) {
        oldChart.destroy();
    }

    const newChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: "Confidence in %",
                    data: chartValues,
                    backgroundColor: "#2563eb"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Confidence (%)"
                    }
                }
            }
        }
    });

    chartsForExampleImages.set(exampleIndex, newChart);
}

// Richtet Upload, Drag-and-drop und Button ein
function setupUserImageUpload() {
    if (!userFileInput || !userImagePreview || !userClassifyButton || !userDropZone) {
        return;
    }

    userFileButton.addEventListener("click", function () {
        userFileInput.click();
    });

    userFileInput.addEventListener("change", function (event) {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        handleUserImageFile(selectedFile);
    });

    userClassifyButton.addEventListener("click", classifyUserImage);

    const stopDefaultBrowserBehavior = function (event) {
        event.preventDefault();
        event.stopPropagation();
    };

    ["dragenter", "dragover"].forEach(function (eventName) {
        userDropZone.addEventListener(eventName, function (event) {
            stopDefaultBrowserBehavior(event);
            userDropZone.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        userDropZone.addEventListener(eventName, function (event) {
            stopDefaultBrowserBehavior(event);
            userDropZone.classList.remove("is-dragover");
        });
    });

    userDropZone.addEventListener("drop", function (event) {
        const droppedFile = event.dataTransfer?.files?.[0];

        if (!droppedFile) {
            return;
        }

        handleUserImageFile(droppedFile);
    });

    updateUserClassifyButton();
}

// Verarbeitet die hochgeladene Bilddatei
function handleUserImageFile(selectedFile) {
    if (!allowedFileTypes.has(selectedFile.type)) {
        userClassificationText.textContent = "Klassifiziert: Ungültiges Dateiformat";
        userClassificationText.className = "classified-text";
        return;
    }

    if (currentUserImageUrl) {
        URL.revokeObjectURL(currentUserImageUrl);
    }

    currentUserImageUrl = URL.createObjectURL(selectedFile);

    userImagePreview.src = currentUserImageUrl;
    userImagePreview.alt = selectedFile.name;
    userFileNameText.textContent = selectedFile.name;

    userClassificationText.textContent = "Klassifiziert: ...";
    userClassificationText.className = "classified-text";

    updateUserClassifyButton();

    userImagePreview.onload = function () {
        classifyUserImage();
    };
}

// Aktiviert oder deaktiviert den Klassifizieren-Button
function updateUserClassifyButton() {
    userClassifyButton.disabled = !(modelIsReady && !!userImagePreview.src);
}

// Klassifiziert das hochgeladene Nutzerbild
function classifyUserImage() {
    if (!modelIsReady || !userImagePreview.src) {
        return;
    }

    userClassifyButton.disabled = true;
    userClassificationText.textContent = "Klassifiziert: ...";
    userClassificationText.className = "classified-text";

    imageClassifier.classify(userImagePreview, 5, function (error, classificationResults) {
        if (error || !Array.isArray(classificationResults) || classificationResults.length === 0) {
            userClassificationText.textContent = "Klassifiziert: Fehler (" + (error?.message || "Unbekannt") + ")";
            userClassificationText.className = "classified-text";
            updateUserClassifyButton();
            return;
        }

        const bestResult = classificationResults[0];
        const bestLabel = (bestResult.label || "Unbekannt").split(",")[0];
        const bestConfidencePercent = ((bestResult.confidence || 0) * 100).toFixed(1);

        userClassificationText.textContent =
            "Klassifiziert: " + bestLabel + " (" + bestConfidencePercent + " %)";

        userClassificationText.className = "classified-text";

        renderUserChart(classificationResults.slice(0, 5));
        updateUserClassifyButton();
    });
}

// Erstellt ein Diagramm für das Nutzerbild
function renderUserChart(classificationResults) {
    const chartLabels = classificationResults.map(function (classificationResult) {
        return (classificationResult.label || "Unbekannt").split(",")[0];
    });

    const chartValues = classificationResults.map(function (classificationResult) {
        return Number((classificationResult.confidence * 100).toFixed(2));
    });

    if (userChart) {
        userChart.destroy();
    }

    userChart = new Chart(userChartCanvas, {
        type: "bar",
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: "Confidence in %",
                    data: chartValues,
                    backgroundColor: "#2563eb"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Confidence (%)"
                    }
                }
            }
        }
    });
}