const colors = ['Orange', 'Gold']
let app = document.getElementById("app")
let loginDiv = document.getElementById("loginDiv")
let logoutDiv = document.getElementById("logoutDiv")
let graphDiv = document.getElementById("graphDiv")

function init() {
    if (localStorage.loggedIn != "true") {
        login()
        logoutDiv.style.display = "none"
    } else {
        home()
        loginDiv.style.display = "none"
    }
}

function login() {
    app.style.display = "none";
    loginDiv.className = "loginDiv";

    let loginForm = document.createElement("form");

    let loginName = document.createElement("input");
    loginName.type = "text";
    loginName.name = "username";
    loginName.className = "input";
    loginName.placeholder = "Username or email";
    loginName.id = "username";
    loginName.required = true;

    let loginPassword = document.createElement("input");
    loginPassword.type = "password";
    loginPassword.name = "password";
    loginPassword.className = "input";
    loginPassword.placeholder = "Password";
    loginPassword.id = "password";
    loginPassword.required = true;

    loginPassword.addEventListener("keyup", (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            authorize();
        }
    });

    let button = document.createElement("button");
    button.type = "submit";
    button.className = "button";
    button.innerHTML = "Login";

    let error = document.createElement("h2");
    error.style.display = "none";
    error.id = "error";
    error.className = "error";

    // Apply CSS margin for spacing between elements
    loginName.style.marginBottom = "10px";
    loginPassword.style.marginBottom = "10px";

    // Appending elements to the form
    loginForm.appendChild(loginName);
    loginForm.appendChild(loginPassword);
    loginForm.appendChild(button);
    loginForm.appendChild(error);

    // Appending form to loginDiv
    loginDiv.appendChild(loginForm);

    // Adding submit event listener
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        authorize();
    });
}


async function authorize() {
    let error = document.getElementById("error")
    error.style.display = "none"
    var usernameEmail = document.getElementById("username").value
    var password = document.getElementById("password").value


    let data = btoa(usernameEmail + ':' + password) // encodes to base64-encoded ASCII string.
    let response = await fetch("https://01.kood.tech/api/auth/signin", {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${data}`
        }
    })

    let token = await response.json()

    if (response.status == "401" || response.status == "403") { // error codes: 401 Unauthorized,403 Forbidden
        error.style.display = ""
        error.innerHTML = "Username or password incorrect, please try again"
        return
    }

    // Storing token information in local storage and setting loggedIn flag true
    localStorage.setItem('JWToken', token)
    localStorage.setItem('loggedIn', true)
    document.getElementById("loginDiv").style.display = "none"

    home()
}

async function home() {
    logoutDiv.style.display = ""
    app.style.display = ""
    app.innerHTML = ""

    // Fetch user data
    let userData = await fetchUserData()
    if (!userData) return   // Check if user data exists

    renderUserInfo(userData.data.user[0])
}

async function fetchUserData() {
    let token = localStorage.getItem('JWToken')
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
        })

        let data = await response.json()
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}

function renderUserInfo(userData) {
    let userInfoDiv = document.createElement("div")
    userInfoDiv.className = "userInfoDiv"

    let header = document.createElement("h2")
    header.className = "header"
    header.innerHTML = "Profile information:"

    let userId = document.createElement("p")
    userId.innerHTML = "User ID:<br>" + userData.id

    let userLogin = document.createElement("p")
    userLogin.innerHTML = "Username:<br>" + userData.login

    let userCreatedAt = document.createElement("p")
    userCreatedAt.innerHTML = "Account-Creation:<br>" + new Date(userData.createdAt).toLocaleString()

    let auditsData = calculateAuditsRatio(userData.transactions)
    let xpProgression = calculateXPProgression(userData.transactions)

    let xpProgressionElement = document.createElement("p")
    xpProgressionElement.innerHTML = "XP Progression:<br>" + xpProgression / 1000 + " kB"

    userInfoDiv.appendChild(header)
    userInfoDiv.appendChild(userId)
    userInfoDiv.appendChild(userLogin)
    userInfoDiv.appendChild(userCreatedAt)
    userInfoDiv.appendChild(xpProgressionElement)

    app.appendChild(userInfoDiv)

    // Render graphs
    renderPieChart(auditsData.auditsDone, auditsData.auditsReceived)
    renderXPProgressionGraph(userData.transactions)
}

// calculate the audits ratio
function calculateAuditsRatio(transactions) {
    let upAmount = 0
    let downAmount = 0

    transactions.forEach(transaction => {
        if (transaction.type === "up") {
            upAmount += transaction.amount
        } else if (transaction.type === "down") {
            downAmount += transaction.amount
        }
    })

    let auditsRatio = (upAmount / downAmount)

    return {
        auditsRatio: auditsRatio,
        auditsDone: upAmount,
        auditsReceived: downAmount
    }
}

// calculate the total XP progression gained from performed tasks
function calculateXPProgression(transactions) {
    let totalXP = 0

    transactions.forEach(transaction => {
        // Check if the transaction is for XP progression from performed tasks, taking out all the xp gained from piscines
        if (transaction.type === "xp" && !transaction.path.includes('piscine')) {
            totalXP += transaction.amount
        }
    })

    return totalXP
}

// render the pie chart
function renderPieChart(upAmount, downAmount) {
    let graphDiv = document.createElement("div")
    graphDiv.id = "graphDiv"
    graphDiv.className = "graphDiv"
    app.appendChild(graphDiv)

    const totalAudits = upAmount + downAmount
    const percentAuditsDone = (upAmount / totalAudits) * 100
    const percentAuditsReceived = (downAmount / totalAudits) * 100

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.id = "PieChart"
    svg.setAttribute("width", "200")
    svg.setAttribute("height", "300")

    // Set the radius and center of the pie chart
    const radius = 80
    const centerX = 100
    const centerY = 100

    let startAngle = 0
    let endAngle = 0

    // Draw the done audits slice
    endAngle = (percentAuditsDone / 100) * 360
    const path1 = describeArc(centerX, centerY, radius, startAngle, endAngle)
    const slice1 = document.createElementNS("http://www.w3.org/2000/svg", "path")
    slice1.setAttribute("d", path1)
    slice1.setAttribute("fill", colors[0])
    svg.appendChild(slice1)
    startAngle = endAngle

    // Draw the received audits slice
    endAngle = 360
    const path2 = describeArc(centerX, centerY, radius, startAngle, endAngle)
    const slice2 = document.createElementNS("http://www.w3.org/2000/svg", "path")
    slice2.setAttribute("d", path2)
    slice2.setAttribute("fill", colors[1])
    svg.appendChild(slice1)
    svg.appendChild(slice2)

    // Calculate percentages as strings
    const donePercentageString = percentAuditsDone.toFixed(2) + " %"
    const receivedPercentageString = percentAuditsReceived.toFixed(2) + " %"
    let auditRatio = Math.round((upAmount / downAmount) * 10) / 10

    // Create text elements for displaying percentages
    const percentageText = document.createElementNS("http://www.w3.org/2000/svg", "text")
    percentageText.setAttribute("x", centerX)
    percentageText.setAttribute("y", centerY + radius + 30)
    percentageText.setAttribute("text-anchor", "middle")
    percentageText.innerHTML = receivedPercentageString + " / " + donePercentageString

    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text")
    nameText.setAttribute("x", centerX)
    nameText.setAttribute("y", centerY + radius + 50)
    nameText.setAttribute("text-anchor", "middle")
    nameText.innerHTML = "received / done";

    const auditRatioText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    auditRatioText.setAttribute("x", centerX);
    auditRatioText.setAttribute("y", centerY + radius + 80);
    auditRatioText.setAttribute("text-anchor", "middle");
    auditRatioText.innerHTML = auditRatio + " Audit Ratio";

    const auditRatioStatement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    auditRatioStatement.setAttribute("x", centerX);
    auditRatioStatement.setAttribute("y", centerY + radius + 100);
    auditRatioStatement.setAttribute("text-anchor", "middle");
    auditRatioStatement.innerHTML = (auditRatio >= 1.2) ? "Almost perfect!" : "Good enough.";

    svg.appendChild(percentageText)
    svg.appendChild(nameText)
    svg.appendChild(auditRatioText);
    svg.appendChild(auditRatioStatement);

    // Append the pie chart container to the app div
    graphDiv.appendChild(svg)
}

// create a pie slice path
function describeArc(x, y, radius, startAngle, endAngle) {
    const startRadians = (startAngle - 90) * Math.PI / 180
    const endRadians = (endAngle - 90) * Math.PI / 180

    const startX = x + radius * Math.cos(startRadians)
    const startY = y + radius * Math.sin(startRadians)
    const endX = x + radius * Math.cos(endRadians)
    const endY = y + radius * Math.sin(endRadians)

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

    const arc = [
        "M", x, y,
        "L", startX, startY,
        "A", radius, radius, 0, largeArcFlag, 1, endX, endY,
        "Z"
    ].join(" ")

    return arc
}

// render the XP progression graph using D3.js
function renderXPProgressionGraph(transactions) {
    const xpTransactions = transactions.filter(transaction => transaction.type === "xp" && !transaction.path.includes('piscine') && transaction.createdAt)

    xpTransactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    // Extract timestamps and XP amounts from filtered transactions
    const timestamps = xpTransactions.map(transaction => new Date(transaction.createdAt))
    const xpAmounts = xpTransactions.map(transaction => transaction.amount)

    // Calculate cumulative XP amounts over performed tasks
    const cumulativeXP = xpAmounts.reduce((acc, xp) => {
        acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + xp)
        return acc
    }, [])

    // Define margins and dimensions for the graph
    const margin = { top: 20, right: 30, bottom: 30, left: 60 }
    const fullWidth = Math.min(0.5 * window.innerWidth, 800) // 60% of window width, capped at 800px
    const width = fullWidth - margin.left - margin.right
    const height = Math.round((2 / 3) * width) // Maintain 2:3 aspect ratio

    // Create SVG element using D3.js
    const svg = d3.select("#graphDiv")
        .append("svg")
        .attr("id", "XP-Progression")
        .attr("width", fullWidth)
        .attr("height", height + margin.top + margin.bottom)

    // Create axes scale using D3.js
    const xScale = d3.scaleTime()
        .domain([timestamps[0], d3.max(timestamps)])    // Adjusted to start from the first timestamp
        .range([0, width])

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(cumulativeXP)])  // Adjusted to include 0
        .range([height, 0])

    // X-Axis text
    const xAxis = d3.axisBottom(xScale)
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis)

    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-20)") // Rotate the text by -30 degrees
        .attr("y", 10)
        .attr("x", -10)
        .style("text-anchor", "middle"); // Adjust text anchor for better alignment

    // Y-Axis text
    const yAxis = d3.axisLeft(yScale)
    svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(yAxis)

    // Create line generator using D3.js
    const line = d3.line()
        .x((d, i) => xScale(timestamps[i]))
        .y((d, i) => yScale(cumulativeXP[i]))

    // Draw line graph using D3.js
    svg.append("path")
        .datum(timestamps)
        .attr("fill", "none")
        .attr("stroke", colors[0])
        .attr("stroke-width", 4)
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("d", line)

    // Append a title to the graph
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", height / 15)
        .attr("text-anchor", "middle")
        .style("font-size", "1.25rem")
        .text("XP Progression")
}

function logout() {
    localStorage.clear()
    window.location.replace("/")
}

init()