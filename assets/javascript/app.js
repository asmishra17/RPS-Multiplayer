$(document).ready(function() {

// *global variables*

var player1 = null;
var player2 = null;

var name1 = "";
var name2 = "";

var yourName = "";

var turn = 1;

// *firebase related*

// getting a reference to the database service
var database = firebase.database();

// attach a listener to the database /players/ node 
database.ref("/players/").on("value", function(snapshot) {
    
    if (snapshot.child("player1").exists()) {
        
        player1 = snapshot.val().player1;
        name1 = player1.name;

        // updating player 1's display
        $(".name1").text(name1);
        $("#player1Stats").html(`Wins: ${player1.wins} Losses: ${player1.losses} Ties: ${player1.ties}`);
    } else {
        
        player1 = null;
        name1 = "";

        
        $(".name1").text("Waiting for Player 1...");
        $("#player1Box").removeClass("playerTurn");
        $("#player2Box").removeClass("playerTurn"); 
        database.ref("/outcome/").remove();
        $("#roundOutcome").html("Rock-Paper-Scissors");
        $("#waitingNotice").html("");
        $("#player1Stats").html("Wins: 0 Losses: 0 Ties: 0");
    }

    
    if (snapshot.child("player2").exists()) {

        player2 = snapshot.val().player2;
        name2 = player2.name;

        // update player 2 display
        $(".name2").text(name2);
        $("#player2Stats").html(`Wins: ${player2.wins} Losses: ${player2.losses} Ties: ${player2.ties}`);
    } else {
        
        player2 = null;
        name2 = "";

        // update player 2 display
        $(".name2").text("Waiting for Player 2...");
        $("#player1Box").removeClass("playerTurn");
        $("#player2Box").removeClass("playerTurn"); 
        database.ref("/outcome/").remove();
        $("#roundOutcome").html("Rock-Paper-Scissors");
        $("#waitingNotice").html("");
        $("#player2Stats").html("Wins: 0 Losses: 0 Ties: 0");
    }

    // if both players are present, it's player 1's turn
    if (player1 && player2) {
        // update the display with a border around player 1
        $("#player1Box").addClass("playerTurn");

        // update the center display
        $("#waitingNotice").html(`Waiting on ${name1} to choose...`);
    }

    // if both players leave the game, empty the chat session
    if (!player1 && !player2) {
        database.ref("/chat/").remove(); 
        database.ref("/turn/").remove();
        database.ref("/outcome/").remove();

        $(".chatbox").empty();
        $("#player1Box").removeClass("playerTurn");
        $("#player2Box").removeClass("playerTurn"); 
        $("#roundOutcome").html("Rock-Paper-Scissors");
        $("#waitingNotice").html("");
    }
});

// attach a listener that detects user disconnection events
database.ref("/players/").on("child_removed", function (snapshot) {
    var msg = `${snapshot.val().name} has disconnected!`;

    // get a key for the disconnection chat entry
    var chatKey = database.ref().child("/chat/").push().key;

    // save the disconnection chat entry
    database.ref("/chat/" + chatKey).set(msg);
});

// attach a listener to the database /chat/ node 
database.ref("/chat/").on("child_added", function (snapshot) {
    var chatMsg = snapshot.val();
    var chatEntry = $("<div>").text(chatMsg);

    // assigning chat message colors
    if (chatMsg.includes("disconnected")) {
        chatEntry.addClass("chatColorDisconnect");
    } else if (chatMsg.includes("joined")) {
        chatEntry.addClass("chatColorConnect");
    } else if (chatMsg.startsWith(yourName)) {
        chatEntry.addClass("chatColor1");
    } else {
        chatEntry.addClass("chatColor2");
    }

    $(".chatbox").append(chatEntry);
});

// attach a listener to the database /turn/ node 
database.ref("/turn/").on("value", function (snapshot) {

    if (snapshot.val() === 1) {
        turn = 1;
    
        if (player1 && player2) {
            $("#player1Box").addClass("playerTurn");
            $("#player2Box").removeClass("playerTurn");
            $("#waitingNotice").html(`Waiting on ${name1} to choose...`);
        }

    } else if (snapshot.val() === 2) {
        turn = 2;

        if (player1 && player2) {
            $("#player1Box").removeClass("playerTurn");
            $("#player2Box").addClass("playerTurn");
            $("#waitingNotice").html(`Waiting on ${name2} to choose...`);
        }
    }
})

// attach a listener to the database /outcome/ node
database.ref("/outcome/").on("value", function (snapshot) {
    $("#roundOutcome").html(snapshot.val());
});

// *buttons below*

// add an event listener to the submit button that adds users to the database
$("#addName").on("click", function(event) {
    event.preventDefault();

    if ( ($("#nameInput").val().trim() !== "") && !(player1 && player2)) {
        // adding player 1
        if (player1 === null) {
            yourName = $("#nameInput").val().trim();
            player1 = {
                name: yourName,
                wins: 0,
                losses: 0,
                ties: 0,
                choice: "",
            };
            
            // add player1 to the database
            database.ref().child("/players/player1").set(player1);

            // set the turn value to 1
            database.ref().child("/turn").set(1);

            // if this user disconnects, remove user
            database.ref("/players/player1").onDisconnect().remove();

            // append name to top of screen
            $(".helloName").append(`Hello ${yourName}! You are Player 1`);

        } else if ( (player1 !== null) && (player2 === null) ) {
            yourName = $("#nameInput").val().trim();
            player2 = {
                name: yourName,
                wins: 0,
                losses: 0,
                ties: 0,
                choice: "",
                number: "Player 2"
            };

            database.ref().child("/players/player2").set(player2);

            database.ref("/players/player2").onDisconnect().remove();

            $(".helloName").append(`Hello ${yourName}! You are Player 2`);
        }

        // add a user joined message to the chat
        var msg = `${yourName} has joined!`;

        // get a key for the join chat entry
        var chatKey = database.ref().child("/chat/").push().key;

        // save the join chat 
        database.ref("/chat/" + chatKey).set(msg);

        // reset the name input
        $("#nameInput").val("");
    }
});

// attach an event handler to the send button
$("#sendButton").on("click", function(event) {
    event.preventDefault();

    if ( (yourName !== "") && ($("#chatInput").val().trim( ) !== "" )) {
        // get message from input box and reset input box
        var msg = `${yourName}: ${$("#chatInput").val().trim()}`;
        $("#chatInput").val("");

        // get a key for the new chat entry
        var chatKey = database.ref().child("/chat/").push().key;

        // save the new chat entry
        database.ref("/chat/" + chatKey).set(msg);
    }
});

// monitor player 1's choice
$("#player1Box").on("click", ".option", function(event) {
    event.preventDefault();

    if (player1 && player2 && (yourName === player1.name) && (turn === 1) ) {

        var choice = $(this).text().trim();

        database.ref().child("/players/player1/choice").set(choice);

        turn = 2;
        database.ref().child("/turn").set(2);
    }
});

// monitor player 2's selection
$("#player2Box").on("click", ".option", function(event) {
    event.preventDefault();

    if (player1 && player2 && (yourName === player2.name) && (turn === 2) ) {

        var choice = $(this).text().trim();

        database.ref().child("/players/player2/choice").set(choice);

        // compare user choices, show outcome
        rpsPlay();
    }
});

// rpsPlay is the game logic
function rpsPlay () {
    if (player1.choice === "Rock") {
        if (player2.choice === "Rock") {
            database.ref().child("/outcome/").set("Both players chose Rock. Tie game!");
            database.ref().child("/players/player1/ties").set(player1.ties + 1);
            database.ref().child("/players/player2/ties").set(player2.ties + 1);
        } else if (player2.choice === "Paper") {
            database.ref().child("/outcome/").set(`${player1.name} chose Rock and ${player2.name} chose Paper. Paper wins!`);
            database.ref().child("/players/player1/losses").set(player1.losses + 1);
            database.ref().child("/players/player2/wins").set(player2.wins + 1);
        } else { // player 2's choice is scissors
            database.ref().child("/outcome/").set(`${player1.name} chose Rock and ${player2.name} chose Scissors. Rock wins!`);
            database.ref().child("/players/player1/wins").set(player1.wins + 1);
            database.ref().child("/players/player2/losses").set(player2.losses + 1);
        }
    } else if (player1.choice === "Paper") {
    
        if (player2.choice === "Rock") {
            database.ref().child("/outcome/").set(`${player1.name} chose Paper and ${player2.name} chose Rock. Paper wins!`);
            database.ref().child("/players/player1/wins").set(player1.wins + 1);
            database.ref().child("/players/player2/ties").set(player2.losses + 1);
        } else if (player2.choice === "Paper") {
            database.ref().child("/outcome/").set("Both players chose Paper. Tie game!");
            database.ref().child("/players/player1/ties").set(player1.ties + 1);
            database.ref().child("/players/player2/ties").set(player2.ties + 1);
        } else { // player 2's choice is scissors
            database.ref().child("/outcome/").set(`${player1.name} chose Paper and ${player2.name} chose Scissors. Scissors win!`);
            database.ref().child("/players/player1/losses").set(player1.losses + 1);
            database.ref().child("/players/player2/wins").set(player2.wins + 1);
        }
    } else if (player1.choice === "Scissors") {
       if (player2.choice === "Rock") {
           database.ref().child("/outcome/").set(`${player1.name} chose Scissors and ${player2.name} chose Rock. Rock wins!`);
           database.ref().child("/players/player1/losses").set(player1.losses + 1);
           database.ref().child("/players/player2/wins").set(player2.wins + 1);
       } else if (player2.choice === "Paper") {
           database.ref().child("/outcome/").set(`${player1.name} chose Scissors and ${player2.name} chose Paper. Scissors win!`);
           database.ref().child("/players/player1/wins").set(player1.wins + 1);
           database.ref().child("/players/player2/losses").set(player2.losses + 1);
       } else { // player 2's choice is scissors
           database.ref().child("/outcome/").set("Both players chose Scissors. Tie game!");
           database.ref().child("/players/player1/ties").set(player1.ties + 1);
           database.ref().child("/players/player2/ties").set(player2.ties + 1);
       }
    }
    turn = 1;
    database.ref().child("/turn").set(1);
}
});
