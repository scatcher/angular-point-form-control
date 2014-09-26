'use strict';

/**
 * @ngdoc directive
 * @name angularPoint.apInputGroup
 * @description
 * Creates individual form controls for each of the field names provided.
 * @param {function|number} [cols=3] Column width in a 12 column layout.
 * @param {string} [description=''] Optional description text.
 * @param {object} [fieldDefinition={'Definition from model'}] Optionally override the field definition stored in the
 * model with a custom field definition.
 * @param {string[]} [fieldDefinition.Choices] Choices to appear in dropdown.
 * @param {string} [fieldDefinition.label] Label for the input.
 * @param {string} [fieldDefinition.objectType] One of the valid SharePoint field types.
 * @param {function} [fieldDefinition.validation] Custom validation function that receives 3 parameters
 * [currentValue, entity, fieldName].
 * @param {string} fieldName The name of the property on the entity to bind to.
 * @param {string|function} [groupClass="col-sm-3"] Class to use for the containing element.
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
                entity: '=',
                fieldDefinition: '=?',
                fieldName: '=',
                groupClass: '=',
                label: '=?',
                ngDisabled: '=',
                validation: '=?'
            },
            restrict: 'A',
            transclude: true,
            require: '^form',
            templateUrl: 'src/apInputGroup.html',
            link: function (scope, elem, attr, ctrl) {

                var fieldDefinition = scope.fieldDefinition || getFieldDefinition(scope.entity, scope.fieldName);

                if (!_.isObject(fieldDefinition)) {
                    throw new Error('apInputGroup requires a valid field definition object', scope);
                }

                var defaultNumberOfColumns = 3;

                var defaults = {
                    boundSelectValue: null, //Location we use to store value from select so we can build lookup value
                    columns: defaultNumberOfColumns,
                    description: null,
                    disabled: false,
                    inputGroupClass: 'col-sm-3',
                    label: fieldDefinition.DisplayName,
                    lookupField: 'title',
                    placeholder: null
                };

                var options = _.extend({}, defaults, fieldDefinition, scope);

                if (!_.isString(options.fieldName)) {
                    throw new Error('Field name is either undefined or not a string.  Ensure you place apostrophe\'s' +
                    ' inside the quotes when identifying data-field-name.');
                }

                /** Expose to templates */
                scope.options = options;
                scope.validate = validate;
                scope.updateSingleSelectLookup = updateSingleSelectLookup;
                scope.updateMultipleSelectLookup = updateMultipleSelectLookup;


                if (_.isFunction(options.groupClass)) {
                    scope.$watch('entity.' + options.fieldName, function (newVal, oldVal) {
                        evaluateContainerClass();
                        console.log('Scope change detected.');
                    });
                }

                /** Set the default field value if empty and the Default is specified */
                if (!scope.entity[options.fieldName] && options.Default) {
                    scope.entity[options.fieldName] = options.Default;
                }

                /** Optionally choose alternative templates based on type */
                switch (options.objectType) {
                    case 'Boolean':
                        options.contentUrl = 'src/apInputControl.Boolean.html';
                        break;
                    case 'Choice':
                        options.contentUrl = 'src/apInputControl.Choice.html';
                        break;
                    case 'DateTime':
                        options.contentUrl = 'src/apInputControl.Date.html';
                        options.validation = options.validation || dateValidation;
                        break;
                    case 'HTML':
                        options.contentUrl = 'src/apInputControl.HTML.html';
                        defaultNumberOfColumns = 12;
                        break;
                    //TODO differentiate integer from number
                    case 'Integer':
                        options.contentUrl = 'src/apInputControl.Number.html';
                        break;
                    case 'Number':
                        options.contentUrl = 'src/apInputControl.Number.html';
                        break;
                    case 'Lookup':
                        initializeSingleLookup();
                        options.contentUrl = 'src/apInputControl.Lookup.html';
                        break;
                    case 'LookupMulti':
                        initializeMultiLookup();
                        options.contentUrl = 'src/apInputControl.LookupMulti.html';
                        break;
                    case 'MultiChoice':
                        options.contentUrl = 'src/apInputControl.MultiChoice.html';
                        scope.entity[options.fieldName] = scope.entity[options.fieldName] || [];
                        break;
                    case 'Note':
                        options.rows = options.rows || 6;
                        defaultNumberOfColumns = 12;
                        options.contentUrl = 'src/apInputControl.Note.html';
                        break;
                    default:
                        options.contentUrl = 'src/apInputControl.Text.html';
                }

                return evaluateContainerClass();

                /**======================PRIVATE============================*/

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:evaluateContainerClass
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Allows us to pass in a function to dynamically size the input group.
                 */
                function evaluateContainerClass() {
                    var groupClass = options.groupClass || buildColumnBasedClass();
                    if (_.isFunction(groupClass)) {
                        options.inputGroupClass = groupClass();
                    } else {
                        options.inputGroupClass = groupClass;
                    }
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:buildColumnBasedClass
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Used when a class isn't specified for the input group.  Using a 12 column
                 * layout, we create the appropriate class. [col-sm-1 through col-sm-12]
                 * @returns {string} Bootstrap class name.
                 */
                function buildColumnBasedClass() {
                    var cols = options.cols || defaultNumberOfColumns;
                    return 'col-sm-' + cols;
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:exposeLookupOptions
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Returns options.lookupOptions if provided.  Otherwise we attempt to lookup the GUID
                 * of the list we're referencing and then fetch all cached values for that list from
                 * the cache.
                 * @param {object} entity List item.
                 */
                function exposeLookupOptions(entity) {
                    var lookupOptions = {};

                    if(options.lookupOptions) {
                        lookupOptions = options.lookupOptions;
                    } else {
                        var lookupListGuid = options.List;
                        if (lookupListGuid) {
                            lookupOptions = apCacheService.getCachedEntities(lookupListGuid);
                            if (_.isFunction(options.lookupFilter)) {
                                lookupOptions = options.lookupFilter(entity, lookupOptions);
                            }
                        }
                    }
                    scope.lookupOptions = lookupOptions;
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:getFieldDefinition
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * @param {object} entity List item.
                 * @param {string} fieldName Property name on the entity.
                 * @returns {Object} Field definition defined in the model for that list.
                 */
                function getFieldDefinition(entity, fieldName) {
                    return entity.getFieldDefinition(fieldName);
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:updateSingleSelectLookup
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Fired on ng-change after a lookup is changed and pushed that change back to
                 * the original model.
                 * @param {string} selectionId LookupId formatted as a string.
                 */
                function updateSingleSelectLookup(selectionId) {
                    /** Create an object with expected lookupId/lookupValue properties */
                    scope.entity[options.fieldName] = buildLookupObject(selectionId);
                }


                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:buildLookupObject
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Converts the string id used in select2 into the a properly formatted lookup
                 * field containing a {lookupId: (Number|*), lookupValue: *}
                 * @param {string} stringId LookupId formatted as a string.
                 * @returns {object} Lookup object. {lookupId: (Number|*), lookupValue: *}
                 */
                function buildLookupObject(stringId) {
                    var intID = parseInt(stringId, 10);
                    var match = scope.lookupOptions[intID];
                    return {lookupId: intID, lookupValue: match[options.lookupField]};
                }


                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:initializeSingleLookup
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Abstracts a lookup type field by temporary creating another model
                 * specially formatted to work with select2.
                 */
                function initializeSingleLookup() {
                    var targetProperty = scope.entity[options.fieldName];
                    exposeLookupOptions(scope.entity);

                    /** Process initially and whenever the underlying value is changed */
                    scope.$watch('entity.' + options.fieldName, function () {
                        if (_.isObject(targetProperty) && targetProperty.lookupId) {
                            /** Set the selected id as string */
                            options.boundSelectValue = targetProperty.lookupId;
                        }
                    });
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:updateMultipleSelectLookup
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Updates the true model when the select2 values change.
                 */
                function updateMultipleSelectLookup(selectionIds) {
                    /** Ensure field being bound against is array */
                    if (!_.isArray(scope.entity[options.fieldName])) {
                        scope.entity[options.fieldName] = [];
                    }
                    /** Clear out existing contents */
                    scope.entity[options.fieldName].length = 0;
                    /** Push formatted lookup object back */
                    _.each(selectionIds, function (stringId) {
                        scope.entity[options.fieldName].push(buildLookupObject(stringId));
                    });
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:initializeMultiLookup
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Abstracts the multi-lookup inputs model and creates an intermediary model that contains
                 * specially formatted values to work with select2.
                 */
                function initializeMultiLookup() {
                    var targetProperty = scope.entity[options.fieldName];
                    exposeLookupOptions(scope.entity);
                    options.boundSelectValue = [];

                    scope.$watch('entity.' + options.fieldName, function () {
                        /**  Set the string version of id's to allow multi-select control to work properly */
                        _.each(targetProperty, function (selectedLookup) {
                            /** Push id as a string to match what Select2 is expecting */
                            options.boundSelectValue.push(selectedLookup.lookupId.toString());
                        });
                    });
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:validate
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * Uses any custom validation logic provided to determine validity.
                 * @param {*} $value Current value of the input.
                 * @returns {boolean} Validation results or true if none specified.
                 */
                function validate($value) {
                    if (options.validation && _.isFunction(options.validation)) {
                        var val = $value || '';
                        return options.validation(val, scope.entity, options.fieldName);
                    } else {
                        return true;
                    }
                }

                /**
                 * @ngdoc function
                 * @name angularPoint.apInputGroup:dateValidation
                 * @methodOf angularPoint.apInputGroup
                 * @description
                 * We're using ui-date so we don't have the normal date validation logic built in.  Simply
                 * checks if the val is either empty or a valid date.
                 * @param {*} val Current value of the input.
                 * @returns {boolean} Validation results.
                 */
                function dateValidation(val) {
                    return val ? _.isDate(val) : true;
                }
            }
        };
    });
