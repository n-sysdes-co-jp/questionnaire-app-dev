# YABUMI questionnaire
================================================

## Overview
 Questionnaires and aggregate results, combine Heroku and Salesforce.
 
## Description
 If you try to use this application, you need to prepare the following salesforce objects:

QuestionnaireMaster__c(templete)
Questionnaire__c(questionnaire)
QuestionnaireRespondent__c(respondent)
QuestionnaireQuestion__c(result)

If you want to see details about the objects, see below:
 https://github.com/n-sysdes-co-jp/salesforceObjects

Please edit ".env" to change database URL or API key and more.

If you want to send mails, create Questionnaire__c, QuestionnaireRespondent__c and QuestionnaireQuestion__c records in salesforce, then run sendmailloop.js.
 $ node sendmailloop.js

## Requirement
- salescorce lisence
  * Other Requirement settings are described in "package.json".

## Usage
 [MIT](https://github.com/tcnksm/tool/blob/master/LICENCE)
 [tcnksm](https://github.com/tcnksm)
 [Ladda](https://github.com/hakimel/Ladda)
 [expressjs](https://github.com/expressjs/session)

## Documentation
 YABUMIアンケートマニュアル.docx

For more information about using Node.js on Heroku, see these Dev Center articles:

- [Getting Started with Node.js on Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Best Practices for Node.js Development](https://devcenter.heroku.com/articles/node-best-practices)
- [Using WebSockets on Heroku with Node.js](https://devcenter.heroku.com/articles/node-websockets)

## Author
 NIHON SYSTEM & DESIGN, INC.