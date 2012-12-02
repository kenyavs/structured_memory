$(function() {
  Card = Backbone.View.extend({
    initialize: function(){
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
      this.options.board.recordClick(this);
      this.undelegateEvents();
    },
    //this handler is currently called for every view instance created. how can i only have it be called once?
    flipOff: function(){
      var selectedCards = this.options.board.get("selectedCards");

      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("off");
      } 
    },
    removeCard: function(){
      var selectedCards = this.options.board.get("selectedCards");
      
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click/remove click event listener 
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("removed");
      }
    },
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
    initialize: function(){
      this.set({"selectedCards":[], "numberOfMatches":0, "clickNum":0, "cards":[]});
    },
    incrementClicks: function(){
      this.set("clickNum", this.get("clickNum")+1);
    },
    recordClick: function(card){
      this.get("selectedCards").push(card);
    },
    resetClicks: function(){
      this.trigger("flipOff");
      this.set("clickNum", 0);
      this.set("selectedCards", []);
    },
    checkGameStatus: function(){
      if(this.get("clickNum")===2){
        this.compareClicks();
        var self = this;

        function innerFunction(self){
          self.resetClicks();

          if(self.get("numberOfMatches")===self.get("uniqueCards")){
            self.trigger("askToPlayAgain"); 
          }
        }

        setTimeout(function(){innerFunction(self)}, 500);
      }
    },
    compareClicks: function(){
      if($(this.get("selectedCards")[0].el).html()===$(this.get("selectedCards")[1].el).html()){
        console.log("It's a match!");
        var self = this;
          
        function innerFunction(self){
          self.trigger("removeCard");
        }
        setTimeout(function(){innerFunction(self)}, 500);
        this.set("numberOfMatches", this.get("numberOfMatches")+1);
      }
      else{
        var length = this.get("selectedCards").length;
        for(var i = 0; i<length; i++){
          this.get("selectedCards")[i].delegateEvents({"click": "flipOn"});
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
        var uniqueCards = this.getTweets().length/2;
        var row = 4;
        var col = 3;
        this.tweets = this.getTweets();//getTweets(username);
        this.board = new Board({tweets:this.tweets, row:row, col:col, uniqueCards:uniqueCards});
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
    initialize: function(){
      this.options.board.bind('askToPlayAgain', this.askToPlayAgain, this);
    },
    events:{
      "click #board": "triggerCheckGameStatus",
      "click #play-again .button": "reloadWindow"
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
          cardNum++;
        }
      }
    },
    createRow: function(){
      var row = "<div class='div-row'>";
      $("#board").append(row);
    },
    getRowElement: function(){
      return $(".div-row").last();
    },
    triggerCheckGameStatus: function(){
      this.options.board.checkGameStatus();
    },
    askToPlayAgain:function(){
      $("#username").addClass("z-index");
      $("#play-again").removeClass("hide");    
    },
    render: function(){
      $("#username").addClass("hide");
      //$(this.el).show();
      //return $(this.el);
    },
    reloadWindow: function(){
      window.location.reload();
    }
  });
  
  var searchview  = new SearchView;
});


//the model triggers and the view does something like this.model.on