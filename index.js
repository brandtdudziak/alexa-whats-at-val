/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const rp = require('request-promise');
const cheerio = require('cheerio');

const SKILL_NAME = 'What\'s at Val';
const GET_BREAKFAST_MESSAGE = " for breakfast, Val is serving ";
const GET_LUNCH_MESSAGE = " for lunch, Val is serving ";
const GET_DINNER_MESSAGE = " for dinner, Val is serving ";
const HELP_MESSAGE = 'Tell me which meal you would like the menu for';
const HELP_REPROMPT = 'Which meal would you like the menu for?';
const STOP_MESSAGE = '';

//=========================================================================================================================================
//Handlers
//=========================================================================================================================================

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetMenuIntent');
    },
    'GetMenuIntent': function () {
        var menu = '';
        var breakfastMenu = '';
        var lunchMenu = '';
        var dinnerMenu = '';

        var date = new Date();
        var tomorrow = false;
        var time = date.getHours() - 4; //EST (Amherst) is 5 hours behind UTC

        if(time < 0) {time += 24;}
        if(time >= 20) {tomorrow = true;}
        if(time == 19) {date.setDate(date.getDate()-1);}

        var monthString = "";
        var dayString = "";

        var month = date.getMonth() + 1;
        if(month < 10){monthString = "0" + month;}
        else{monthString = month;}

        var day = date.getDate();
        if(day < 10){dayString = "0" + day;}
        else{dayString = day;}

        var dateString = "" + date.getFullYear() + "-" + monthString + "-" + dayString;
        
        var speechOutput = '';
        if(tomorrow) {speechOutput = 'Tomorrow';}
        else {speechOutput = 'Today';}

        //Cheerio - retrieve from whatsatval.com using the menu index
        const options = {
            uri: 'https://www.amherst.edu/campuslife/housing-dining/dining/menu',
            transform: function (body) {
                return cheerio.load(body);
            }
        };

        //Request-promise
        rp(options)
          .then(($) => {
            breakfastMenu = $('#dining-menu-' + dateString + '-Breakfast-menu-listing').text()
            console.log(breakfastMenu);
            lunchMenu = $('#dining-menu-' + dateString + '-Lunch-menu-listing').text()
            console.log(lunchMenu);
            dinnerMenu = $('#dining-menu-' + dateString + '-Dinner-menu-listing').text()
            console.log(dinnerMenu);


            //Remove ampersands, incompatible with Alexa response
            while(breakfastMenu.indexOf('&') != -1){
                breakfastMenu = breakfastMenu.substring(0, breakfastMenu.indexOf('&')) + 'and' + breakfastMenu.substring(breakfastMenu.indexOf('&') + 1);
            }
            while(lunchMenu.indexOf('&') != -1){
                lunchMenu = lunchMenu.substring(0, lunchMenu.indexOf('&')) + 'and' + lunchMenu.substring(lunchMenu.indexOf('&') + 1);
            }
            while(dinnerMenu.indexOf('&') != -1){
                dinnerMenu = dinnerMenu.substring(0, dinnerMenu.indexOf('&')) + 'and' + dinnerMenu.substring(dinnerMenu.indexOf('&') + 1);
            }

            //Outdated - whatsatval.com
            //breakfastMenu = menu.substring(menu.indexOf('breakfast') + 31, menu.indexOf('Pastry') - 3);
            //lunchMenu = menu.substring(menu.indexOf('Traditional') + 14, menu.indexOf('dinner') - 4);
            //dinnerMenu = menu.substring(menu.indexOf('Traditional', menu.indexOf('Traditional') + 1) + 14, menu.length - 3);

            breakfastMenu = breakfastMenu.substring(15, breakfastMenu.indexOf('Ancient')) + 'and also ' + breakfastMenu.substring(breakfastMenu.indexOf('Smoothies') + 9); //start after Breakfast/Grill and add smoothies
            lunchMenu = lunchMenu.substring(lunchMenu.indexOf('Traditional') + 11) + ' and also ' + lunchMenu.substring(lunchMenu.indexOf('Soup') + 4, lunchMenu.indexOf('Traditional')); //start after Traditional and add soups
            dinnerMenu = dinnerMenu.substring(dinnerMenu.indexOf('Traditional') + 11); //start after Traditional

          })
          .then(() => {
            //Do not add past meals to response
            if (time < 10 || time > 19) {speechOutput += GET_BREAKFAST_MESSAGE + breakfastMenu + '.';}
            if (time < 14 || time > 19) {speechOutput += GET_LUNCH_MESSAGE + lunchMenu + '.';}
            speechOutput += GET_DINNER_MESSAGE + dinnerMenu + '.';

            this.response.cardRenderer(SKILL_NAME, speechOutput);
            this.response.speak(speechOutput);
            this.emit(':responseReady');
          })
          .catch((err) => {
            console.log(err);
            this.response.cardRenderer(SKILL_NAME, "ERROR");
            this.response.speak('An error occurred while trying to fetch today\'s menu');
            this.emit(':responseReady');
          });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};
