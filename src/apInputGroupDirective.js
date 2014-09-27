'use strict';

/**
 * @ngdoc directive
 * @name angularPoint.apInputGroup
 * @description
 * Creates the appropriate input type for an angular-point list item field.  Binds the field to the entity, passes
 * through validation and input control, and manages wiring up standard form group functionality.  Either a entity and
 * a fieldName need to be provided, where we can then find the appropriate field definition from the model or a field
 * definition object is passed in with an entity and field name property on it.  Manually specifying a value on with
 * an HTML attribute overrides defaults as well as values stored in the fieldDefinition.
 * @param {function|number} [cols=3] Column width in a 12 column layout.
 * @param {string} [description=''] Optional description text.
 * @param {object} [fieldDefinition={'Definition from model'}] Optionally override the field definition stored in the
 * model with a custom field definition.
 * @param {string[]} [fieldDefinition.Choices] Choices to appear in dropdown.  This is automatically added to the
 * definition for a choice type field when we extend the field definition after our first request to the server.
 * @param {string} [fieldDefinition.label] Label for the input.
 * @param {string} [fieldDefinition.objectType] One of the valid SharePoint field types.
 * @param {function} [fieldDefinition.validation] Custom validation function that receives 3 parameters
 * [currentValue, entity, fieldName].
 * @param {string} [fieldName=fieldDefinition.fieldName] The name of the property on the entity to bind to.
 * @param {string|function} [groupClass="col-sm-3"] Class to use for the containing element.
 * @param {object} [entity=fieldDefinition.entity] SharePoint list item.
 * @param {string} [label=fieldDefinition.label|fieldDefinition.DisplayName] Label for the input.
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
                entity: '=?',
                fieldDefinition: '=?',
                fieldName: '=?',
                groupClass: '=?',
                label: '=?',
                ngDisabled: '=?',
                validation: '=?'
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'src/apInputGroup.html',
            link: function (scope, elem, attr, ctrl) {

                var fieldDefinition = scope.fieldDefinition || getFieldDefinition(scope.entity, scope.fieldName);

                if (!_.isObject(fieldDefinition)) {
                    throw new Error('apInputGroup requires a valid field definition object', scope);
                }
                /** Called after setup for post processing */
                var postSetupQueue = [evaluateContainerClass];

                var defaultNumberOfColumns = 3;

                var defaults = {
                    columns: defaultNumberOfColumns,
                    contentUrl: '',
                    description: null,
                    disabled: false,
                    inputGroupClass: 'col-sm-3',
                    label: fieldDefinition.label || fieldDefinition.DisplayName,
                    lookupField: 'title',
                    maxlength: undefined,
                    minlength: undefined,
                    placeholder: null,
                    required: false,
                    rows: 6,
                    validationMessage: ''
                };

                /** Optionally choose alternative templates based on type */
                switch (fieldDefinition.objectType) {
                    case 'Boolean':
                        defaults.contentUrl = 'src/apInputControl.Boolean.html';
                        break;
                    case 'Choice':
                        defaults.contentUrl = 'src/apInputControl.Choice.html';
                        break;
                    case 'DateTime':
                        defaults.contentUrl = 'src/apInputControl.Date.html';
                        defaults.validation = defaults.validation || dateValidation;
                        defaults.validationMessage = 'Please enter a valid date.';
                        break;
                    case 'HTML':
                        defaults.contentUrl = 'src/apInputControl.HTML.html';
                        defaultNumberOfColumns = 12;
                        break;
                    //TODO differentiate integer from number
                    case 'Integer':
                    case 'Number':
                        defaults.contentUrl = 'src/apInputControl.Number.html';
                        defaults.validationMessage = 'Not a valid number!';
                        break;
                    case 'Lookup':
                        postSetupQueue.push(function() {
                            exposeLookupOptions(options.entity);
                        });
                        defaults.contentUrl = 'src/apInputControl.Lookup.html';
                        break;
                    case 'LookupMulti':
                        postSetupQueue.push(function() {
                            options.entity[options.fieldName] = options.entity[options.fieldName] || [];
                            exposeLookupOptions(options.entity);
                        });
                        defaults.contentUrl = 'src/apInputControl.LookupMulti.html';
                        break;
                    case 'MultiChoice':
                        defaults.contentUrl = 'src/apInputControl.MultiChoice.html';
                        break;
                    case 'Note':
                        defaultNumberOfColumns = 12;
                        defaults.contentUrl = 'src/apInputControl.Note.html';
                        break;
                    default:
                        defaults.contentUrl = 'src/apInputControl.Text.html';
                }


                var options = _.extend({}, defaults, fieldDefinition, scope);

                if (!_.isString(options.fieldName)) {
                    throw new Error('Field name is either undefined or not a string.  Ensure you place apostrophe\'s' +
                    ' inside the quotes when identifying data-field-name.');
                }

                /** Expose to templates */
                scope.options = options;
                scope.validate = validate;

                /** If the class for the group is a function, set a watch to update the class after changing */
                if (_.isFunction(options.groupClass)) {
                    scope.$watch('entity.' + options.fieldName, function () {
                        evaluateContainerClass();
                    });
                }

                /** Set the default field value if empty and the Default is specified */
                if (!options.entity[options.fieldName] && options.Default) {
                    options.entity[options.fieldName] = options.Default;
                }

                _.each(postSetupQueue, function(process) {
                    process();
                });


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
                    if(!options.lookupOptions) {
                        var lookupListGuid = options.List;
                        if (lookupListGuid) {
                            options.lookupOptions = apCacheService.getCachedEntities(lookupListGuid);
                            if (_.isFunction(options.lookupFilter)) {
                                options.lookupOptions = options.lookupFilter(entity, lookupOptions);
                            }
                        }
                    }

                    /** Need to be formatted as an array */
                    options.lookupArray = _.isArray(options.lookupOptions) ?
                        options.lookupOptions : _.toArray(options.lookupOptions);
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
                    if(!entity || !fieldName) {
                        throw new Error('An entity and fieldName are both required on the directive if' +
                        'a fieldDefinition isn\'t specified.')
                    }
                    return entity.getFieldDefinition(fieldName);
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
                        return options.validation(val, options.entity, options.fieldName);
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
