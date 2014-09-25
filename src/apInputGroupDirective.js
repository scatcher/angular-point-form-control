'use strict';

/**
 * @ngdoc directive
 * @name angular-point.directive:apInputGroup
 * @description
 * Creates individual form controls for each of the field names provided.
 * @param {function|number} [cols=3] Column width in a 12 column layout.
 * @param {string} [description=''] Optional description text.
 * @param {object} [fieldDefinition={Definition from model}] Optionally override the field definition stored in the
 * model with a custom field definition.
 * @param {string[]} [fieldDefinition.Choices] Choices to appear in dropdown.
 * @param {string} [fieldDefinition.label] Label for the input.
 * @param {string} [fieldDefinition.objectType] One of the valid SharePoint field types.
 * @param {string} fieldName The name of the property on the entity to bind to.
 * @param {object} entity SharePoint list item.
 * @param {string} [label] Label for the input.
 * @param {boolean} [ngDisabled=false] Pass through to disable control using ng-disabled on element if set.
 * @param {function} [validation] Allow you to pass in validation logic.
 * @restrict A
 * */
angular.module('angularPoint')
    .directive('apInputGroup', function (_, apCacheService) {
        return {
            scope: {
                /** Optionally specify the number of columns for this form group directly instead of using model */
                cols: '=?',
                description: '=?',
                fieldDefinition: '=?',
                fieldName: '=',
                entity: '=',
                label: '=?',
                ngDisabled: '=',
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

                var fieldDefinition = scope.fieldDefinition || getFieldDefinition(scope.entity, scope.fieldName);
                var validation = fieldDefinition.validation || validation;

                var state = {
                    description: scope.description || fieldDefinition.Description || null,
                    label: scope.label || fieldDefinition.label || fieldDefinition.DisplayName,
                    lookupField: 'title',
                    placeholderValue: null
                };

                /** Expose to templates */
                scope.state = state;
                scope.fieldDefinition = fieldDefinition;
                scope.validation = validation;

                evaluateColumnWidth();

                if(_.isFunction(scope.cols)) {
                    scope.$watch('entity.' + scope.fieldName, function (oldVal, newVal) {
                        evaluateColumnWidth();
                        console.log('Scope change detected.');
                    });
                }

                /** Default input type is text */
                scope.contentUrl = 'src/apInputControl.Text.html';

                /** Optionally choose alternative templates based on type */
                switch (fieldDefinition.objectType) {
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
                        scope.rows = scope.rows || fieldDefinition.rows || 6;
                        scope.cols = 12;
                        scope.contentUrl = 'src/apInputControl.Note.html';
                        break;
                    default:
                        scope.contentUrl = 'src/apInputControl.Text.html';
                }

                /**
                 * @description
                 * Allows us to pass in a function to dynamically size the input group.
                 */
                function evaluateColumnWidth() {
                    var cols = scope.cols || fieldDefinition.cols || 3;
                    if(_.isFunction(cols) && cols() !== scope.columns) {
                        scope.columns = cols();
                    } else {
                        scope.columns = cols;
                    }
                }

                function getLookupOptions(entity) {
                    var lookupOptions = {};
                    var lookupListGuid = fieldDefinition.List;
                    if (lookupListGuid) {
                        lookupOptions = apCacheService.getCachedEntities(lookupListGuid);
                        if (_.isFunction(fieldDefinition.lookupFilter)) {
                            lookupOptions = fieldDefinition.lookupFilter(entity, lookupOptions);
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
                    return {lookupId: intID, lookupValue: match[state.lookupField]};
                }


                function initializeSingleLookup() {
                    var targetProperty = scope.entity[scope.fieldName];
                    getLookupOptions(scope.entity);

                    scope.updateSingleSelectLookup = updateSingleSelectLookup;
                    /** Process initially and whenever the underlying value is changed */
                    scope.$watch('entity.' + scope.fieldName, function () {
                        if (_.isObject(targetProperty) && targetProperty.lookupId) {
                            /** Set the selected id as string */
                            state.placeholderValue = targetProperty.lookupId;
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
                    state.placeholderValue = [];

                    scope.updateMultipleSelectLookup = updateMultipleSelectLookup;

                    scope.$watch('entity.' + scope.fieldName, function () {
                        /**  Set the string version of id's to allow multi-select control to work properly */
                        _.each(targetProperty, function (selectedLookup) {
                            /** Push id as a string to match what Select2 is expecting */
                            state.placeholderValue.push(selectedLookup.lookupId.toString());
                        });
                    });
                }

                function validation($form, entity) {
                    return true;
                }
            }
        };
    });
