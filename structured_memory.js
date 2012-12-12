$(function() {
  TweetCollection = Backbone.Collection.extend({
    initialize: function(options){
      this.username = options.username;
      this.tweets = options.tweets;
      this.rows = options.rows || 3;
      this.cols = options.cols || 4;
    },
    url: function() { 
      var username = this.username;
      return 'https://api.twitter.com/1/statuses/user_timeline.json?screen_name='+username+'&count=20';
    },
    // override backbone sync to force a jsonp call
    sync: function(method, model, options){  
      options.dataType = "jsonp";  
      return Backbone.sync(method, model, options); 
    },
    parse: function(response){
      var UNIQUE_CARDS = (this.rows*this.cols)/2;

      response = _.shuffle(response);
      response = response.slice(0,UNIQUE_CARDS);
      response = response.map(function(r, idx) {
        var obj = {};
        obj['matchId'] = idx;
        obj['text'] = r['text'];
        return obj;
      }, response);
      response = _.shuffle(response.concat(response));

      return response;
    },
  });

  Card = Backbone.View.extend({
    events: {
      "click": "flipOn"
    },
    initialize: function(options) {
      this.options.board.bind('flipOff', this.flipOff, this);
      this.options.board.bind("removeCard", this.removeCard, this);
    },
    flipOn: function() {
      this.$el.removeClass("off");
      this.$el.addClass("on");
      this.options.board.incrementClicks();
      this.options.board.recordClick(this);
      this.undelegateEvents();
    },
    //this handler is currently called for every view instance created. how can i only have it be called once?
    flipOff: function() {
      var selectedCards = this.options.board.get("selectedCards");

      //TODO: switch out for loops for each where appropriate.
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("off");
      } 
    },
    removeCard: function() {
      var selectedCards = this.options.board.get("selectedCards");
      
      for(var i = 0; i<selectedCards.length; i++){
        //gray out cell and disable click/remove click event listener 
        $(selectedCards[i].el).removeClass("on");
        $(selectedCards[i].el).addClass("removed");
      }
    },
    render: function() {
      var boardCards = this.options.board.attributes.cards;

      this.$el.html(this.options.text);
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
      this.trigger("flipOff");//DISCUSS: it seems like the trouble here is the events triggers on every single card instance...irrespective of what's passed to the [*args]
      this.set("clickNum", 0);
      this.set("selectedCards", []);
    },
    checkGameStatus: function(){
      if(this.get("clickNum")===2){
        this.compareClicks();
        var self = this;

        function innerFunction(){
          self.resetClicks();

          if(self.get("numberOfMatches")===self.get("uniqueCards")){
            self.trigger("askToPlayAgain"); 
          }
        }

        setTimeout(function(){innerFunction()}, 500);
      }
    },
    compareClicks: function(){
      if(this.get("selectedCards")[0].options.matchId===this.get("selectedCards")[1].options.matchId){
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
      }
    }
  });


  UsernameView = Backbone.View.extend({
    el: $("#username"),
    events: {
      "click #username .button":"validateUsername"
    },
    validateUsername: function(){
      var username = $(".username-input").val();

      if(!username){
        displayError("Must enter username to play.");
      }
      else{
        $("#message-drawer").addClass("hide");
        var tweets = this.requestTweets(username);
      }
    },
    requestTweets: function(username){
      this.tweetCollection = new TweetCollection({username:username});

      this.tweetCollection.bind("reset", this.createGameViewAndBoard, this);
      this.tweetCollection.fetch();
    },
    createGameViewAndBoard: function(){
      this.board = new Board({tweets:this.tweetsCollection, row:row, col:col, uniqueCards:UNIQUE_CARDS});
      this.gameView = new GameView({board: this.board});  
      this.gameView.loadTweets();
      this.gameView.hideUsernameBox();
    }
  });

  GameView = Backbone.View.extend({
    el: $("#container"),
    initialize: function(){
      this.options.board.bind('askToPlayAgain', this.askToPlayAgain, this);
    },
    events:{
      "click #board": "checkGameStatus",
      "click #play-again .button": "reloadWindow"
    },
    loadTweets: function(){
      var COL = this.options.board.attributes.col;
      var ROW = this.options.board.attributes.row;
      var cardNum = 0;    
      var tweets = this.options.board.attributes.tweets;

      for(var i = 0; i<ROW; i++){
        this.createRow();
        
        var row = this.getRowElement();
        
        for(var j = 0; j<COL; j++){
          var matchId = tweets[cardNum]["matchId"];
          var text = tweets[cardNum]["text"];

          var newCard = new Card({cardNum:cardNum, matchId:matchId, text:text, row:row, board:this.options.board});
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
    checkGameStatus: function(){
      this.options.board.checkGameStatus();
    },
    askToPlayAgain:function(){
      $("#username").addClass("z-index");
      $("#play-again").removeClass("hide");    
    },
    hideUsernameBox: function(){
      $("#username").addClass("hide");
    },
    reloadWindow: function(){
      window.location.reload();
    }
  });

var displayError = function(msg){
  $(".message-text").html(msg);
  $("#message-drawer").removeClass("hide");
}
  
  var usernameView  = new UsernameView;
});
