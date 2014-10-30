'use strict';

angular.module('demo', [
    //Angular Components
    //'ngSanitize',

    //Angular UI
    'ui.date',
    'ui.select',
    'ui.utils',
    'textAngular',

    //SP-Angular
    'angularPoint'

])
    .config(function (uiSelectConfig) {
        uiSelectConfig.theme = 'bootstrap';
    })
    .controller('demoController', function ($scope) {
        $scope.listItem = {
            text: 'This is some text.',
            number: 33,
            note: 'Hello world',
            date: new Date(),
            emptyDate: null,
            invalidDate: 'some text',
            html: '<div>I\'m HTML</div>',
            choice: 'Choice 1',
            multiChoice: null,
            singleLookup: '',
            multipleLookup: null,
            choice2: null,
            anotherLookup: null,
            validationText: 'cccca',
            validationNumber: 9,
            invalidChoice: 'Choice 1'
        };

        var choices = ['Choice 1', 'Choice 2', 'Choice 3'];

        var state = {
            displayDescription: false,
            required: false,
            disabled: false,
            validation: false,
            placeholder: false
        };

        var lookups = {
            1: {
                title: 'Lookup 1',
                custom: 'Custom Lookup Value 1',
                id: 1
            },
            2: {
                title: 'Lookup 2',
                custom: 'Custom Lookup Value 2',
                id: 2
            },
            3: {
                title: 'Lookup 3',
                custom: 'Custom Lookup Value 3',
                id: 3
            }
        };

        var fieldDefinitions = getFieldDefinitions();
        var fieldsWithoutGroups = getFieldsWithoutGroups();
        $scope.fieldDefinitions = fieldDefinitions;
        $scope.fieldsWithoutGroups = fieldsWithoutGroups;
        $scope.toggleBooleanProperty = toggleBooleanProperty;
        $scope.state = state;

        function getFieldDefinitions() {
            return [
                [
                    {
                        cols: 3,
                        fieldName: 'validText',
                        label: 'Valid Text',
                        description: 'I\'m a text field.',
                        maxlength: 3

                    },
                    {
                        cols: 3,
                        fieldName: 'requiredText',
                        required: true,
                        label: 'Required Text'
                    },
                    {
                        cols: 3,
                        fieldName: 'validationText',
                        label: 'Validation Text',
                        validation: function (val, entity, propertyName) {
                            return val.indexOf('a') === -1;
                        },
                        validationMessage: 'Can\'t use the letter "a".'
                    },
                    {
                        cols: 3,
                        fieldName: 'disabledText',
                        label: 'Disabled Text',
                        disabled: true,
                        placeholder: 'Here is a placeholder...'
                    }
                ],
                [
                    {
                        cols: 3,
                        fieldName: 'number',
                        label: 'Number Input',
                        objectType: 'Number',
                        description: 'I\'m a Number field.'
                    },
                    {
                        cols: 3,
                        fieldName: 'requiredNumber',
                        required: true,
                        objectType: 'Number',
                        label: 'Required Number'
                    },
                    {
                        cols: 3,
                        fieldName: 'validationNumber',
                        label: 'Validation Number',
                        min: 3,
                        max: 7,
                        objectType: 'Number',
                        validationMessage: 'Needs to be between 3 and 7.'
                    },
                    {
                        cols: 3,
                        fieldName: 'disabledNumber',
                        label: 'Disabled Number',
                        disabled: true,
                        objectType: 'Number',
                        placeholder: 'Here is a placeholder...'
                    }
                ],
                [
                    {
                        cols: 3,
                        fieldName: 'validDate',
                        label: 'Valid Date',
                        description: 'I\'m a date field.',
                        objectType: 'DateTime'
                    },
                    {
                        cols: 3,
                        fieldName: 'emptyDate',
                        label: 'Required Date',
                        required: true,
                        description: 'I\'m a empty date field.',
                        objectType: 'DateTime'
                    },
                    {
                        cols: 3,
                        fieldName: 'invalidDate',
                        label: 'Invalid Date',
                        description: 'I\'m an invalid date field.',
                        objectType: 'DateTime'
                    },
                    {
                        cols: 3,
                        fieldName: 'disabledDate',
                        label: 'Disabled Date',
                        description: 'I\'m an invalid date field.',
                        objectType: 'DateTime',
                        placeholder: 'I\'m pretty disabled...',
                        disabled: true
                    }
                ],
                [
                    {
                        cols: 3,
                        fieldName: 'choice',
                        label: 'Choice',
                        description: 'I\'m a simple select.',
                        objectType: 'Choice',
                        Choices: choices
                    },
                    {
                        cols: 3,
                        fieldName: 'choice2',
                        label: 'Required Single Choice',
                        description: 'i am a choice',
                        objectType: 'Choice',
                        Choices: choices,
                        required: true
                    },
                    {
                        cols: 3,
                        fieldName: 'invalidChoice',
                        label: 'Another Single Choice',
                        description: 'i am a choice',
                        objectType: 'Choice',
                        Choices: choices,
                        validation: function (val, entity, propertyName) {
                            return val === 'Choice 2';
                        },
                        validationMessage: 'Only Choice 2 is valid.'
                    },
                    {
                        cols: 3,
                        fieldName: 'disabledChoice',
                        label: 'Disabled Choice',
                        description: 'i am a choice',
                        objectType: 'Choice',
                        Choices: choices,
                        placeholder: 'I\'m soooo disabled...',
                        disabled: true
                    }
                ],
                [
                    {
                        cols: 3,
                        fieldName: 'multiChoice',
                        label: 'MultiChoice',
                        required: true,
                        description: 'I\'m a multi choice select.',
                        objectType: 'MultiChoice',
                        Choices: choices
                    },
                    {
                        cols: 3,
                        fieldName: 'boolean',
                        label: 'Boolean',
                        description: 'I\'m a boolean.',
                        objectType: 'Boolean',
                        validation: function (val) {
                            return val;
                        },
                        validationMessage: 'I really need to be clicked...'
                    },
                    {
                        cols: 3,
                        fieldName: 'currency',
                        label: 'Currency Input',
                        objectType: 'Currency',
                        description: 'I\'m a Currency field.'
                    }

                ],
                [
                    {
                        cols: 3,
                        fieldName: 'singleLookup',
                        label: 'Single Lookup',
                        description: 'I\'m a simple lookup.',
                        objectType: 'Lookup',
                        lookupOptions: lookups
                    },
                    {
                        cols: 3,
                        fieldName: 'anotherLookup',
                        label: 'Another Single Lookup',
                        description: 'I lookup 1 thing.',
                        objectType: 'Lookup',
                        lookupOptions: lookups,
                        ShowField: 'Custom'
                    }
                ],
                [
                    {
                        cols: 3,
                        fieldName: 'multipleLookup',
                        label: 'Multiple Lookup',
                        description: 'I lookup multiple things.',
                        objectType: 'LookupMulti',
                        lookupOptions: lookups
                    }

                ],
                [
                    {
                        cols: 12,
                        entity: $scope.listItem,
                        fieldName: 'html',
                        label: 'HTML',
                        rows: 1,
                        objectType: 'HTML'
                    }
                ],
                [
                    {
                        cols: 6,
                        fieldName: 'note',
                        label: 'Note',
                        rows: 3,
                        objectType: 'Note',
                        validation: function (val, entity, propertyName) {
                            return val.length < 3;
                        },
                        validationMessage: 'You can only have 3 characters here!!!'
                    }
                ]
            ];
        }

        function getFieldsWithoutGroups() {
            return [
                [
                    {
                        cols: 3,
                        inputGroup: false,
                        fieldName: 'validText',
                        label: 'Valid Text',
                        description: 'I\'m a text field.'
                    },
                    {
                        cols: 3,
                        inputGroup: false,
                        fieldName: 'number',
                        label: 'Number Input',
                        objectType: 'Number',
                        description: 'I\'m a Number field.'
                    },
                    {
                        cols: 3,
                        fieldName: 'lookupWithoutGroup',
                        inputGroup: false,
                        label: 'You shouldn\'t see this.',
                        description: 'I lookup 1 thing.',
                        objectType: 'Lookup',
                        lookupOptions: lookups,
                        ShowField: 'Custom'
                    }
                ]
            ]
        }

        function toggleBooleanProperty(propertyName) {
            state[propertyName] = !state[propertyName];
            _.each(fieldDefinitions, function (row) {
                _.each(row, function (field) {
                    field[propertyName] = state[propertyName];
                });
            });
        }

        function toggleTextProperty(propertyName) {
            state[propertyName] = !state[propertyName];
            _.each(fieldDefinitions, function (row) {
                _.each(row, function (field) {
                    field[propertyName] = state[propertyName];
                });
            });
        }

    });
