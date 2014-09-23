'use strict';

/**
 * @ngdoc directive
 * @name angular-point.directive:apInputGroup
 *
 * @description
 * _Please update the description and restriction._
 *
 * @restrict A
 * */


angular.module('RTM')
    .directive('apInputGroup', function (_, apCacheService) {
        return {
            scope: {
                /** Optionally specify the number of columns for this form group directly instead of using model */
                cols: '=?',
                description: '=?',
                fieldDefinition: '=?',
                fieldName: '=',
                entity: '=',
                /** Option to override the field group label */
                label: '=?',
                ngDisabled: '=',     //Pass through to disable control using ng-disabled on element if set
                validation: '=?'
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'src/apInputGroup.html',
            link: function (scope, elem, attr) {

                if (!_.isString(scope.fieldName)) {
                    throw new Error('Field name is either undefined or not a string.  Ensure you place apostrophe\'s' +
                    ' inside the quotes when identifying data-field-name.');
                }

                scope.fieldDefinition = scope.fieldDefinition || getFieldDefinition(scope.entity, scope.fieldName);

                scope.cols = scope.cols || scope.fieldDefinition.cols || 3;
                scope.label = scope.label || scope.fieldDefinition.label || scope.fieldDefinition.DisplayName;
                scope.description = scope.description || scope.fieldDefinition.Description || null;
                scope.state = {
                    lookupField: 'title',
                    placeholderValue: null
                };

                scope.validation = scope.fieldDefinition.validation || validation;

                /** Default input type is text */
                scope.contentUrl = 'src/apInputControl.Text.html';

                /** Optionally choose alternative templates based on type */
                switch (scope.fieldDefinition.objectType) {
                    case 'Boolean':
                        scope.contentUrl = 'src/apInputControl.Boolean.html';
                        break;
                    case 'Choice':
                        scope.contentUrl = 'src/apInputControl.Choice.html';
                        break;
                    case 'DateTime':
//                        scope.entity[scope.fieldName] = scope.entity[scope.fieldName] || null;
                        scope.contentUrl = 'src/apInputControl.Date.html';
                        break;
                    case 'HTML':
                        scope.contentUrl = 'src/apInputControl.HTML.html';
                        scope.cols = 12;
                        break;
                    case 'Integer':
                        scope.inputType = 'number';
                        break;
                    case 'Lookup':
                        initializeSingleLookup();
                        scope.contentUrl = 'src/apInputControl.Lookup.html';
                        break;
                    case 'LookupMulti':
                        initializeMultiLookup();
                        scope.contentUrl = 'src/apInputControl.LookupMulti.html';
                        break;
                    case 'MultiChoice':
                        scope.contentUrl = 'src/apInputControl.MultiChoice.html';
                        scope.entity[scope.fieldName] = scope.entity[scope.fieldName] || [];
                        break;
                    case 'Note':
                        scope.rows = scope.rows || scope.fieldDefinition.rows || 6;
                        scope.cols = 12;
                        scope.contentUrl = 'src/apInputControl.Note.html';
                        break;
                }

                function getLookupOptions(entity) {
                    var lookupOptions = {};
                    var lookupListGuid = scope.fieldDefinition.List;
                    if (lookupListGuid) {
                        lookupOptions = apCacheService.getCachedEntities(lookupListGuid);
                        if (_.isFunction(scope.fieldDefinition.lookupFilter)) {
                            lookupOptions = scope.fieldDefinition.lookupFilter(entity, lookupOptions);
                        }
                    }
                    scope.lookupOptions = lookupOptions;
                }

                function getFieldDefinition(entity, fieldName) {
                    return entity.getFieldDefinition(fieldName);
                }

                function updateSingleSelectLookup(selectionId) {
                    /** Create an object with expected lookupId/lookupValue properties */
                    scope.entity[scope.fieldName] = buildLookupObject(selectionId);
                }

                function buildLookupObject(stringId) {
                    var intID = parseInt(stringId, 10);
                    var match = scope.lookupOptions[intID];
                    return {lookupId: intID, lookupValue: match[scope.state.lookupField]};
                }


                function initializeSingleLookup() {
                    var targetProperty = scope.entity[scope.fieldName];
                    getLookupOptions(scope.entity);

                    scope.updateSingleSelectLookup = updateSingleSelectLookup;
                    /** Process initially and whenever the underlying value is changed */
                    scope.$watch('entity.' + scope.fieldName, function () {
                        if (_.isObject(targetProperty) && targetProperty.lookupId) {
                            /** Set the selected id as string */
                            scope.state.placeholderValue = targetProperty.lookupId;
                        }
                    });
                }

                function updateMultipleSelectLookup(selectionIds) {
                    /** Ensure field being binded against is array */
                    if (!_.isArray(scope.entity[scope.fieldName])) {
                        scope.entity[scope.fieldName] = [];
                    }
                    /** Clear out existing contents */
                    scope.entity[scope.fieldName].length = 0;
                    /** Push formatted lookup object back */
                    _.each(selectionIds, function (stringId) {
                        scope.entity[scope.fieldName].push(buildLookupObject(stringId));
                    });
                }

                function initializeMultiLookup() {
                    var targetProperty = scope.entity[scope.fieldName];
                    getLookupOptions(scope.entity);
                    scope.state.placeholderValue = [];

                    scope.updateMultipleSelectLookup = updateMultipleSelectLookup;

                    scope.$watch('entity.' + scope.fieldName, function () {
                        /**  Set the string version of id's to allow multi-select control to work properly */
                        _.each(targetProperty, function (selectedLookup) {
                            /** Push id as a string to match what Select2 is expecting */
                            scope.state.placeholderValue.push(selectedLookup.lookupId.toString());
                        });
                    });
                }

                function validation($form, entity) {
                    return true;
                }
            }
        };
    });
