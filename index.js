/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const rp = require('request-promise');
const cheerio = require('cheerio');


const APP_ID = 'amzn1.ask.skill.74c8ddea-9194-41c1-9ae6-bdb19bc6b9cf';

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
        var time = date.getHours() + 19; //EST (Amherst) is 5 hours behind UTC
        if(time > 23) {time -= 24;}

        var monthString = "";
        var dayString = "";

        var month = date.getMonth() + 1;
        if(month < 10){monthString = "0" + month;}
        else{monthString = month;}

        var day = date.getDate();
        if(day < 10){dayString = "0" + day;}
        else{dayString = day;}

        var dateString = "" + date.getFullYear() + "-" + monthString + "-" + dayString;
        
        var speechOutput = 'Today';

        //Cheerio - retrieve from whatsatval.com using the menu index
        const options = {
            uri: 'https://whatsatval.com/menus/dining-menu-' + dateString + '-meals.json',
            transform: function (body) {
                return cheerio.load(body);
            }
        };

        //Request-promise
        rp(options)
          .then(($) => {
            menu = $('body').text()
            console.log(menu);

            //Remove ampersands, incompatible with Alexa response
            while(menu.indexOf('&') != -1){
                menu = menu.substring(0, menu.indexOf('&')) + 'and' + menu.substring(menu.indexOf('&') + 1);
            }

            breakfastMenu = menu.substring(menu.indexOf('breakfast') + 31, menu.indexOf('Pastry') - 3);
            lunchMenu = menu.substring(menu.indexOf('Traditional') + 14, menu.indexOf('dinner') - 4);
            dinnerMenu = menu.substring(menu.indexOf('Traditional', menu.indexOf('Traditional') + 1) + 14, menu.length - 3);
          })
          .then(() => {
            //Do not add past meals to response
            if (time < 10) {speechOutput += GET_BREAKFAST_MESSAGE + breakfastMenu + '.';}
            if (time < 14) {speechOutput += GET_LUNCH_MESSAGE + lunchMenu + '.';}
            speechOutput += GET_DINNER_MESSAGE + dinnerMenu +'.';

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