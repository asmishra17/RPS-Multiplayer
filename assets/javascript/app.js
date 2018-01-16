$(document).ready(function() {

// *global variables*

// storing objects for the players
var player1 = null;
var player2 = null;

// storing the player names
var name1 = "";
var name2 = "";

// storing player's name in the browser
var yourName = "";

// storing player choices
var player1Choice = "";
var player2Choice = "";

// storing whose turn it is
var turn = 1;

// *firebase related*

// getting a reference to the database service
var database = firebase.database();

// attach a listener to the database /players/ node to listen for changes
database.ref("/players/").on("value", function(snapshot) {
    // check for existence of player 1
    if (snapshot.child("player1").exists()) {
        console.log("Player 1 exists");

        // record player 1 data
        player1 = snapshot.val().player1;
        name1 = player1.name;

        // update player1 display
        $(".name1").text(name1);
        $("#player1Stats").html(`Wins: ${player1.wins} Losses: ${player1.losses} Ties: ${player1.ties}`);
    } else {
        console.log("Player 1 does NOT exist");
        
        player1 = null;
        name1 = "";

        // update player 1 display
        $(".name1").text("Waiting for Player 1...");
        $("#player1Box").removeClass("playerTurn");
        $("#player2Box").removeClass("playerTurn"); 
        database.ref("/outcome/").remove();
        $("#roundOutcome").html("Rock-Paper-Scissors");
        $("#waitingNotice").html("");
        $("#player1Stats").html("Wins: 0 Losses: 0 Ties: 0");
    }

    // check for existence of player 2
    if (snapshot.child("player2").exists()) {
        console.log("Player 2 exists");

        // record player 2 data
        player2 = snapshot.val().player2;
        name2 = player2.name;

        // update player 2 display
        $(".name2").text(name2);
        $("#player2Stats").html(`Wins: ${player2.wins} Losses: ${player2.losses} Ties: ${player2.ties}`);
    } else {
        console.log("Player 2 does NOT exist");
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
        console.log("start game test");

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

    // get a key(?) for the disconnection chat entry
    var chatKey = database.ref().child("/chat/").push().key;

    // save the disconnection chat entry
    database.ref("/chat/" + chatKey).set(msg);
});

// attach a listener to the database /chat/ node to listen for new chat messages

database.ref("/chat/").on("child_added", function (snapshot) {
    var chatMsg = snapshot.val();
    var chatEntry = $("<div>").text(chatMsg);

    // change the color of the chat message depending on user or connect/disconnect event
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
    $(".chatbox").scrollTop($(".chatbox")[0].scrollHeight);
});

// attach a listener to the database /turn/ node to listen for any changes

database.ref("/turn/").on("value", function (snapshot) {
    // check if it's player 1's turn
    if (snapshot.val() === 1) {
        console.log("Turn 1");
        turn = 1;
    

        // update the display if both players are in the game
        if (player1 && player2) {
            $("#player1Box").addClass("playerTurn");
            $("#player2Box").removeClass("playerTurn");
            $("#waitingNotice").html(`Waiting on ${name1} to choose...`);
        }
    } else if (snapshot.val() === 2) {
        console.log("Turn 2");
        turn = 2;

        // update the display if both players are in the game
        if (player1 && player2) {
            $("#player1Box").removeClass("playerTurn");
            $("#player2Box").addClass("playerTurn");
            $("#waitingNotice").html(`Waiting on ${name2} to choose...`);
        }
    }
})

// attach a listener to the database /outcome/ node to be notified of the game outcome 
database.ref("/outcome/").on("value", function (snapshot) {
    $("#roundOutcome").html(snapshot.val());
});

// *buttons below*

// add an event listener to the submit button that adds users to the database

$("#addName").on("click", function(event) {
    event.preventDefault();

    // make sure the name field is non-empty
    if ( ($("#nameInput").val().trim() !== "") && !(player1 && player2)) {
        // adding player 1
        if (player1 === null) {
            yourName = $("#nameInput").val().trim();
            player1 = {
                name: yourName,
                wins: 0,
                losses: 0,
                ties: 0,
                choice: ""
            };
            
            // add player1 to the database
            database.ref().child("/players/player1").set(player1);

            // set the turn value to 1
            database.ref().child("/turn").set(1);

            // if this user disconnects, remove user
            database.ref("/players/player1").onDisconnect().remove();
        } else if ( (player1 !== null) && (player2 === null) ) {
            yourName = $("#nameInput").val().trim();
            player2 = {
                name: yourName,
                wins: 0,
                losses: 0,
                ties: 0,
                choice: ""
            };

            database.ref().child("/players/player2").set(player2);
            database.ref("/players/player2").onDisconnect().remove();
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

    // make sure player exists and box is non-empty
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

// monitor player 1's selection
$("#player1Box").on("click", ".option", function(event) {
    event.preventDefault();

    // make selections when both players are in the game
    if (player1 && player2 && (yourName === player1.name) && (turn === 1) ) {
        // record player1's choice 
        var choice = $(this).text().trim();

        // record player choice in the database
        player1Choice = choice;
        database.ref().child("/players/player1/choice").set(choice);

        // set the turn value to 2
        turn = 2;
        database.ref().child("/turn").set(2);
    }
});

// monitor player 2's selection

$("#player2Box").on("click", ".option", function(event) {
    event.preventDefault();

    // make selections when both players are in the game
    if (player1 && player2 && (yourName === player2.name) && (turn === 2) ) {
        // record player 2's choice
        var choice = $(this).text().trim();

        // record player choice in the database
        player2Choice = choice;
        database.ref().child("/players/player2/choice").set(choice);

        //compare choices and record the outcome
        rpsPlay();
    }
});

// rpsPlay is the game logic
function rpsPlay () {
    if (player1.choice === "Rock") {
        if (player2.choice === "Rock") {
            database.ref().child("/outcome/").set("Tie game!");
            database.ref().child("/players/player1/ties").set(player1.ties + 1);
            database.ref().child("/players/player2/ties").set(player2.ties + 1);
        } else if (player2.choice === "Paper") {
            database.ref().child("/outcome/").set("Paper wins!");
            database.ref().child("/players/player1/losses").set(player1.losses + 1);
            database.ref().child("/players/player2/wins").set(player2.wins + 1);
        } else { // player 2's choice is scissors
            database.ref().child("/outcome/").set("Rock wins!");
            database.ref().child("/players/player1/wins").set(player1.wins + 1);
            database.ref().child("/players/player2/losses").set(player2.losses + 1);
        }
    } else if (player1.choice === "Paper") {
    
        if (player2.choice === "Rock") {
            database.ref().child("/outcome/").set("Paper wins!");
            database.ref().child("/players/player1/wins").set(player1.wins + 1);
            database.ref().child("/players/player2/ties").set(player2.ties + 1);
        } else if (player2.choice === "Paper") {
            database.ref().child("/outcome/").set("Tie game!");
            database.ref().child("/players/player1/ties").set(player1.ties + 1);
            database.ref().child("/players/player2/ties").set(player2.ties + 1);
        } else { // player 2's choice is scissors
            database.ref().child("/outcome/").set("Scissors win!");
            database.ref().child("/players/player1/losses").set(player1.losses + 1);
            database.ref().child("/players/player2/wins").set(player2.wins + 1);
        }
    } else if (player1.choice === "Scissors") {
       if (player2.choice === "Rock") {
           database.ref().child("/outcome/").set("Rock wins!");
           database.ref().child("/players/player1/losses").set(player1.losses + 1);
           database.ref().child("/players/player2/wins").set(player2.wins + 1);
       } else if (player2.choice === "Paper") {
           database.ref().child("/outcome/").set("Scissors win!");
           database.ref().child("/players/player1/wins").set(player1.wins + 1);
           database.ref().child("/players/player2/losses").set(player2.losses + 1);
       } else { // player 2's choice is scissors
           database.ref().child("/outcome/").set("Tie game!");
           database.ref().child("/players/player1/ties").set(player1.ties + 1);
           database.ref().child("/players/player2/ties").set(player2.ties + 1);
       }
    }
    turn = 1;
    database.ref().child("/turn").set(1);
}
});
