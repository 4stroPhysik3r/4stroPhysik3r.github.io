var usernameEmail = ""
var password = ""
var app = document.getElementById("app")
var logOutDiv = document.getElementById("logOutDiv")

init()

function init() {
    
    let body = document.getElementById("app")
    if (localStorage.loggedIn != "true") {
        login()
    } else {
        home()
    }
}

function login() {
   
    app.style.display = "none"
    let loginDiv = document.getElementById("loginDiv")
    loginDiv.className = "login"

    let loginForm = document.createElement("form")
    let lineBreak = document.createElement("br")
    //can't append same linebreak 2 times somewhy to the form, so creating 2 different ones : D
    let lineBreak2 = document.createElement("br")
    
    let loginName = document.createElement("input")
    loginName.type = "text"
    loginName.name = "username"
    loginName.className = "input"
    loginName.placeholder = "Username or email"
    loginName.id = "username"
    loginName.required = true
   
    let loginPassword = document.createElement("input")
    loginPassword.type = "password"
    loginPassword.name = "password"
    loginPassword.className = "input"
    loginPassword.placeholder = "Password"
    loginPassword.id = "password"
    loginPassword.required = true

    loginPassword.addEventListener("keyup", (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            authorize()
        }
    })

    let button = document.createElement("button")
    button.type = "submit"
    button.className = "button"
    button.innerHTML = "Login"
    
    let error = document.createElement("h2")
    error.style.display = "none"
    error.id = "error"
    error.className = "error"
    
// append all the shit to the loginForm -> to the loginDiv
    loginForm.appendChild(loginName)
    loginForm.appendChild(lineBreak)
    loginForm.appendChild(loginPassword)
    loginForm.appendChild(lineBreak2)
    loginForm.appendChild(button)
    loginForm.appendChild(error)
    loginDiv.appendChild(loginForm)
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault()
        authorize()
    })
}

async function authorize() {

    let error = document.getElementById("error")
    error.style.display = "none"
    usernameEmail = document.getElementById("username").value
    password = document.getElementById("password").value

    // btoa(): This function is used to encode a string in base64. It takes a string as input and returns a base64-encoded ASCII string.
    //In this case, usernameEmail and password variables are concatenated together with a colon (:) between them.
    let data = btoa(usernameEmail + ':' + password);
    let response = await fetch("https://01.kood.tech/api/auth/signin", {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${data}`
        }
    })
    let token = await response.json()

    // error codes: 
    // 401 - request lacks valid authentication credentials for the target resource.
    // 403 - server understood the request but refuses to authorize it, due to permissions or security reasons. (WRONG username/pass)
    if (response.status == "401" || response.status == "403") {
        error.style.display = ""
        error.innerHTML = "Username / password incorrect, please try again"
        return
    }

    // Storing the information about token in the local storage and setting the loggedIn flag true
    localStorage.setItem('JWToken', token)
    localStorage.setItem('loggedIn', true) 
    document.getElementById("loginDiv").style.display = "none"

    home()
}


function logout() {

    localStorage.clear()
    window.location.replace("/")
}

async function home() {

    logOutDiv.style.display = "";
    app.style.display = "";
    app.innerHTML = "";

    // Fetch user data
    let userData = await fetchUserData();
    console.log(userData)

    // Check if user data exists
    if (userData) {
        renderUserInfo(userData.data.user[0]);
    }
}

// Function to fetch user data
async function fetchUserData() {
    let token = localStorage.getItem('JWToken');
    try {
        let response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    { user {
                        id
                        login
                        createdAt
                        transactions {
                            id
                            type
                            amount
                            objectId
                            createdAt
                            path
                          }
                    }
                }`
            })
        });
        let data = await response.json();
        return data; 
    } catch (error) {
        console.log(error);
        return null; // Return null if error occurs
    }
}

function renderUserInfo(userData) {

    // Create elements to display user information
    let userInfoContainer = document.createElement("div");
    userInfoContainer.className = "userInfoContainer";

    let header = document.createElement("p");
    header.textContent = "My profile information:";
    header.style.fontWeight = "bold"; 
    header.style.fontSize = "1.3em";

    let userId = document.createElement("p");
    userId.textContent = "User ID: " + userData.id;

    let userLogin = document.createElement("p");
    userLogin.textContent = "Username: " + userData.login;

    let userCreatedAt = document.createElement("p");
    userCreatedAt.textContent = "Account created at: " + new Date(userData.createdAt).toLocaleString();

   // Calculate audits ratio
   let auditsData = calculateAuditsRatio(userData.transactions);

   // Create a paragraph element for audits ratio
   let auditsRatioPara = document.createElement("p");
   auditsRatioPara.textContent = "Audits Ratio: " + auditsData.auditsRatio.toFixed(2);

   // Calculate XP progression
   let xpProgression = calculateXPProgression(userData.transactions);

   // Create a paragraph element for xp progression
   let xpProgressionElement = document.createElement("p");
   xpProgressionElement.textContent = "XP Progression: " + xpProgression/1000 + "kB";

    // Append user information elements to the container
    userInfoContainer.appendChild(header);
    userInfoContainer.appendChild(userId);
    userInfoContainer.appendChild(userLogin);
    userInfoContainer.appendChild(userCreatedAt);
    userInfoContainer.appendChild(auditsRatioPara); 
    userInfoContainer.appendChild(xpProgressionElement);
    
    // Append the container to the app div
    app.appendChild(userInfoContainer);

    // Append the pie chart to the app div
    renderPieChart(auditsData.auditsDone, auditsData.auditsReceived);

    // Render XP progression graph
    renderXPProgressionGraph(userData.transactions);
}

// Function to calculate the audits ratio
function calculateAuditsRatio(transactions) {
    
    let upAmount = 0;
    let downAmount = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "up") {
            upAmount += transaction.amount;
        } else if (transaction.type === "down") {
            downAmount += transaction.amount;
        }
    });

    let auditsRatio = (upAmount / downAmount);

    return {
        auditsRatio: auditsRatio,
        auditsDone: upAmount,
        auditsReceived: downAmount
    };
}

// Function to calculate the total XP progression gained from performed tasks
function calculateXPProgression(transactions) {
    let totalXP = 0;

    transactions.forEach(transaction => {
        // Check if the transaction is for XP progression from performed tasks, taking out all the xp gained from piscines
        if (transaction.type === "xp" && !transaction.path.includes('piscine')) {
            totalXP += transaction.amount;
        }
    });

    return totalXP
}

// Function to render the pie chart
function renderPieChart(upAmount, downAmount) {

    const colors = ['#2ca02c', '#98df8a'];
    const totalAudits = upAmount + downAmount;
    const percentAuditsDone = (upAmount / totalAudits) * 100;
    const percentAuditsReceived = (downAmount / totalAudits) * 100;

    // Create the SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "240"); 
    svg.style.display = "block";

    // Set the radius and center of the pie chart
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    // Initialize variables for drawing the pie slices
    let startAngle = 0;
    let endAngle = 0;

    // Draw the "audits done" slice
    endAngle = (percentAuditsDone / 100) * 360;
    const path1 = describeArc(centerX, centerY, radius, startAngle, endAngle);
    const slice1 = createSlice(path1, colors[0]);
    svg.appendChild(slice1);
    startAngle = endAngle;

    // Draw the "audits received" slice
    endAngle = 360;
    const path2 = describeArc(centerX, centerY, radius, startAngle, endAngle);
    const slice2 = createSlice(path2, colors[1]);
    svg.appendChild(slice2);

    // Append the pie chart container to the app div
    app.appendChild(svg);

    // Calculate percentages as strings
    const donePercentageString = percentAuditsDone.toFixed(2) + "%";
    const receivedPercentageString = percentAuditsReceived.toFixed(2) + "%";

    // Create text elements for displaying percentages
    const PercentageText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    PercentageText.setAttribute("x", centerX);
    PercentageText.setAttribute("y", centerY + radius + 20);
    PercentageText.setAttribute("text-anchor", "middle");
    PercentageText.textContent = receivedPercentageString + " / " + donePercentageString;

    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("x", centerX);
    nameText.setAttribute("y", centerY + radius + 40);
    nameText.setAttribute("text-anchor", "middle");
    nameText.textContent = "audits received / done"

    svg.appendChild(PercentageText);
    svg.appendChild(nameText)
    
}

// Function to create a pie slice path
function describeArc(x, y, radius, startAngle, endAngle) {
    const startRadians = (startAngle - 90) * Math.PI / 180;
    const endRadians = (endAngle - 90) * Math.PI / 180;

    const startX = x + radius * Math.cos(startRadians);
    const startY = y + radius * Math.sin(startRadians);

    const endX = x + radius * Math.cos(endRadians);
    const endY = y + radius * Math.sin(endRadians);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const d = [
        "M", x, y,
        "L", startX, startY,
        "A", radius, radius, 0, largeArcFlag, 1, endX, endY,
        "Z"
    ].join(" ");

    return d;
}

// Function to create a pie slice
function createSlice(path, color) {
    const slice = document.createElementNS("http://www.w3.org/2000/svg", "path");
    slice.setAttribute("d", path);
    slice.setAttribute("fill", color);
    return slice;
}


// Function to render the XP progression graph using D3.js
function renderXPProgressionGraph(transactions) {
    
    // Filter transactions for XP progression from performed tasks
    const xpTransactions = transactions.filter(transaction => transaction.type === "xp" && !transaction.path.includes('piscine') && transaction.createdAt);

    // Sort XP transactions by createdAt timestamp
    xpTransactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Extract timestamps and XP amounts from filtered transactions
    const timestamps = xpTransactions.map(transaction => new Date(transaction.createdAt));
    const xpAmounts = xpTransactions.map(transaction => transaction.amount);

    // Calculate cumulative XP amounts over performed tasks
    const cumulativeXP = xpAmounts.reduce((acc, xp) => {
        acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + xp);
        return acc;
    }, []);

    // Define margins and dimensions for the graph
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const fullWidth = Math.min(0.5 * window.innerWidth, 800); // 60% of window width, capped at 800px
    const width = fullWidth - margin.left - margin.right;
    const height = Math.round((2 / 3) * width); // Maintain 2:3 aspect ratio

    // Create SVG element using D3.js
    const svg = d3.select("#app")
        .append("svg")
        .attr("width", fullWidth)
        .attr("height", height + margin.top + margin.bottom);

    // Create X axis scale using D3.js
    const xScale = d3.scaleTime()
        .domain([timestamps[0], d3.max(timestamps)])  // Adjusted to start from the first timestamp
        .range([0, width]);

    // Create Y axis scale using D3.js
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(cumulativeXP)])  // Adjusted to include 0
        .range([height, 0]);

    // Create X axis using D3.js
    const xAxis = d3.axisBottom(xScale);
    svg.append("g")
        .attr("transform", `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis);

    // Create Y axis using D3.js
    const yAxis = d3.axisLeft(yScale);
    svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(yAxis);

    // Create line generator using D3.js
    const line = d3.line()
        .x((d, i) => xScale(timestamps[i]))
        .y((d, i) => yScale(cumulativeXP[i]));

    // Draw line graph using D3.js
    svg.append("path")
        .datum(timestamps)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 4)
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("d", line);

    // Append a title to the graph
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", height/15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("XP Progression");    
}
