'use strict';

angular.module('demo', [
    //Angular Components
    'ngSanitize',

    //Angular UI
    'ui.bootstrap',
    'ui.date',
    'ui.select2',
    'ui.utils',
    'textAngular',

    //SP-Angular
    'angularPoint'

])
    .controller('demoController', function ($scope) {
        $scope.listItem = {
            text: 'This is some text.',
            number: 33,
            note: 'Hello world',
            date: new Date(),
            emptyDate: null,
            invalidDate: 'some text',
            html: '<div>I\'m HTML</div>'
        };

        $scope.config = {
            text: {
                cols: 3,
                label: 'Text Field',
                description: 'I\'m a text field.'
            },
            number: {
                cols: 3,
                label: 'Numeric',
                description: 'I\'m a numeric field.',
                objectType: 'Number'
            },
            validDate: {
                cols: 3,
                label: 'Valid Date',
                description: 'I\'m a date field.',
                objectType: 'DateTime'
            },
            emptyDate: {
                cols: 3,
                label: 'Empty Date',
                required: true,
                description: 'I\'m a empty date field.',
                objectType: 'DateTime'
            },
            invalidDate: {
                cols: 6,
                label: 'Invalid Date',
                description: 'I\'m an invalid date field.',
                objectType: 'DateTime'
            },
            html: {
                cols: 12,
                entity: $scope.listItem,
                fieldName: 'html',
                label: 'HTML',
                disabled: true,
                rows: 1,
                objectType: 'HTML'
            },
            note: {
                cols: 6,
                label: 'Note',
                rows: 3,
                objectType: 'Note',
                validation: function(val, entity, propertyName) {
                    return val.length < 3;
                }
            }
        };
    });
