$(function() {
  Card = Backbone.View.extend({
    initialize: function(){
      //this.on("flipOff", this.flipOff, this);
      this.options.board.bind('flipOff', this.flipOff, this);
      this.options.board.bind("removeCard", this.removeCard, this);
    },
    events:{
      "click": "flipOn"
    },
    flipOn: function(){
      this.$el.removeClass("off");
      this.$el.addClass("on");
      this.options.board.incrementClicks();
      //this.options.board.recordClick(this.el);
      this.options.board.recordClick(this);
      this.undelegateEvents();
      //this.off("click");//remove listener temporarily...unless next card click is a match
      //perhaps more appropriately--->this.off("click", flip)
    },
    //this handler is currently called for every view instance created. how can i only have it be called once?
    flipOff: function(){
      var selectedCards = this.options.board.get("current_clicks");
      console.log(selectedCards.length);
      //var selectedCardsLength = this.options.board.current_clicks.length
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("off");
      } 
    },
    removeCard: function(){
      var selectedCards = this.options.board.get("current_clicks");
      
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click/remove click event listener 
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("removed");
      }
    },
    /*appendRow: function(){
      var data = this.options.board.attributes.tweets;
      var cardNum = this.options.cardNum;
      var text = data[cardNum]["text"];
      $(this.options.row).append("<div class='div-cell off'>"+text+"</div>");
    },*/
    render: function(){
      var data = this.options.board.attributes.tweets;
      var cardNum = this.options.cardNum;
      var text = data[cardNum]["text"];

      this.$el.html(text);
      this.$el.addClass('div-cell off');
      return this;
    }
  });

  Board = Backbone.Model.extend({   
    incrementClicks: function(){
      this.set("click_num", this.get("click_num")+1);
    },
    recordClick: function(card){
      this.get("current_clicks").push(card);
    },
    resetClicks: function(){
      this.trigger("flipOff");
      this.set("click_num", 0);
      this.set("current_clicks", []);
    },
    checkGameStatus: function(){
      if(this.get("click_num")===2){
        this.compareClicks();
        var self = this;
        
        function innerFunction(self){
          self.resetClicks();
          //self.trigger("flipOff");

          if(self.get("number_of_matches")===self.get("max_length")){
            self.get("game_view").askToplayAgain();     
          }
        }

        setTimeout(function(){innerFunction(self)}, 500);
      }
    },
    compareClicks: function(){
      if($(this.get("current_clicks")[0].el).html()===$(this.get("current_clicks")[1].el).html()){
        console.log("It's a match!");
        var self = this;
          
        function innerFunction(self){
          self.trigger("removeCard");
        }

        setTimeout(function(){innerFunction(self)}, 500);
        /*setTimeout(function(){
          removeCard();
            }, 500);*/
        
        this.set("number_of_matches", this.get("number_of_matches")+1);
      }
      else{
        var length = this.get("current_clicks").length;
        for(var i = 0; i<length; i++){
          console.log(this.get("current_clicks")[i]);
          //console.log(this.get("current_clicks")[i]);
          //this.get("current_clicks")[i].delegateEvents({"click":"flipOn"});
          //this.get("cards")[i].delegateEvents({"click" : "flipOn"});

          this.get("current_clicks")[i].delegateEvents({"click": "flipOn"});
          //this.get("cards")[cardNum].delegateEvents({"click": "flipOn"});
        }
        console.log("Welp :/");
      }
    }
  });


  SearchView = Backbone.View.extend({
    el: $("#username"),
    events: {
      "click #play":"validateUsername"
    },
    validateUsername: function(){
      var username = "foodcoachnyc";//e.target;//document.getElementById("username").getElementsByTagName("input")[0].value;

      if(username==''){
        $("message-text").html("Must enter username to play.");
        $("message-text").removeClass("hide");
      }
      else{
        this.tweets = this.getTweets();//getTweets(username);
        this.board = new Board({tweets:this.tweets, current_clicks:[], number_of_matches:0, click_num:0, row:4, col:3, max_length:6, cards:[]});
        this.game_view = new GameView({board: this.board});  
        this.game_view.loadData();
        this.game_view.render();
      }
    },
    getTweets: function(){
      var tweets = [{text:"Pandora", count:2}, {text:"Facebook", count:2}, {text:"Twitter", count:2}, {text:"Grooveshark", count:2}, {text:"Instagram", count:2}, {text:"Spotify", count:2}];
      //shuffle returned tweets to avoid only grabbing/and using the first 6 from a user...then duplicate and shuffle again
      var duplicatedTweets = this.shuffle(tweets.concat(tweets));
      return duplicatedTweets;
      //executeAjaxHandler(username);
    },
    shuffle: function(list){
      var i, j, temp;
      for (i = list.length - 1; i > 0; i--) {
        j = Math.floor(Math.random()*i);
        temp = list[i];
        list[i] = list[j];
        list[j] = temp;
      }
      return list;
    }
  });

  GameView = Backbone.View.extend({
    el: $("#container"),
    events:{
      "click #board": "triggerCheckGameStatus"
    },
    loadData: function(){
      var COL = this.options.board.attributes.col;
      var ROW = this.options.board.attributes.row;
      var cardNum = 0;    
      var tweets = this.options.board.attributes.tweets;


      for(var i = 0; i<ROW; i++){
        this.createRow();
        
        var row = this.getRowElement();
        
        for(var j = 0; j<COL; j++){
          var newCard = new Card({cardNum:cardNum, row:row, board:this.options.board});
          this.options.board.attributes.cards.push(newCard);
          row.append(newCard.render().el);
          //newCard.appendRow();
          cardNum++;
        }
      }
    },
    createRow: function(){
      //$(this.el).append("<div class='div-row'>");//or do i actually want this: $(this.el).append("<div class='div-row'>");<----is appending allowed, even?
      var row = "<div class='div-row'>";
      $("#board").append(row);//or do i actually want this: $(this.el).append("<div class='div-row'>");<----is appending allowed, even?
    },
    getRowElement: function(){
      return $(".div-row").last();
    },
    triggerCheckGameStatus: function(){
      this.options.board.checkGameStatus();
    },
    askToPlayAgain:function(){
      $("username").addClass("z-index");
      $("play-again").removeClass("hide");    
    },
    render: function(){
      $("#username").addClass("hide");
      $(this.el).show(); //<----is this correct?
    }
  });
  
  //appview = new AppView;
  var searchview  = new SearchView;
});


//the model triggers and the view does something like this.model.on