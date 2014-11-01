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
 * @param {string[]} [choices] Choices to appear in dropdown.  This is automatically added to the
 * definition for a choice type field when we extend the field definition after our first request to the server but
 * it comes from a node named Choices so we convert to lowercase for consistency within directive.
 * @param {function|number} [cols=3] Column width in a 12 column layout.
 * @param {string} [description=''] Optional description text.
 * @param {boolean} [disabled=false] Pass through to disable control using ng-disabled on element if set.
 * @param {boolean} [displayDescription=false] Show the field description below the input.
 * @param {object} entity SharePoint list item.
 * @param {object} [fieldDefinition={'Definition from model'}] Optionally override the field definition stored in the
 * model with a custom field definition.  Params can be passed in through this object or as individual attributes
 * on the html element.
 * @param {string} [fieldName=fieldDefinition.fieldName] The name of the property on the entity to bind to.
 * @param {string|function} [groupClass="col-sm-3"] Class to use for the containing element.  If a function is used,
 * the parameters passed to it are (options.entity[options.fieldName], options.entity, options.fieldName).
 * @param {string} [inputClass=""] Class to use on the input element.
 * @param {boolean} [inputGroup=true] By default we get the input group with label and validation but we have the option
 * to just get the desired input if set to false.  We're then responsible for putting it in a container, handling the label, managing
 * validation, and performing any other custom functionality.
 * @param {string} [label=fieldDefinition.label|fieldDefinition.DisplayName] Label for the input.
 * @param {string} [lookupField='title'] The display property to use for a lookup type field.  Typically we do a lookup
 * and use the title but optionally can override with another field name.
 * @param {array} [lookupOptions] Pass in an array of items to be used as options for a select or multi-select.
 * @param {number} max Pass through for inputs that can use this attribute.
 * @param {number} maxlength Pass through for inputs that can use this attribute.
 * @param {number} min Pass through for inputs that can use this attribute.
 * @param {number} minlength Pass through for inputs that can use this attribute.
 * @param {string} placehoder Pass through for inputs that can use this attribute.
 * @param {boolean} required Mark input as invalid if empty.
 * @param {number} rows Pass through for inputs that can use this attribute.
 * @param {string} [objectType=Text] One of the valid SharePoint field types.
 * @param {function} [validation] Custom validation function that receives 2 parameters
 * [{string} currentValue, {object} options].
 * @param {string} [validationMessage=''] Message to display below input when invalid.
 * @param {string} [viewport='sm'] Bootstrap viewport size ['xs', 'sm', 'md', 'lg']
 * @restrict A
 * */
angular.module('angularPoint')
    .directive('apInputGroup', ["_", "apCacheService", "$filter", function (_, apCacheService, $filter) {
        return {
            scope: {
                /** Optionally specify the number of columns for this form group directly instead of using model */
                choices: '=?',
                cols: '=?',
                description: '=?',
                disabled: '=?',
                displayDescription: '=?',
                entity: '=?',
                fieldDefinition: '=?',
                fieldName: '=?',
                groupClass: '=?',
                inputClass: '=?',
                inputGroup: '=?',
                label: '=?',
                lookupField: '=?',
                max: '=?',
                maxlength: '=?',
                min: '=?',
                minlength: '=?',
                placeholder: '=?',
                required: '=?',
                rows: '=?',
                validation: '=?',
                validationMessage: '=?',
                viewport: '=?'
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'src/apInputContainer.html',
            link: function (scope, elem, attr) {

                var fieldDefinition = scope.fieldDefinition || getFieldDefinition(scope.entity, scope.fieldName);

                if (!_.isObject(fieldDefinition)) {
                    throw new Error('apInputGroup requires a valid field definition object', scope);
                }
                /** Called after setup for post processing */
                var postSetupQueue = [evaluateContainerClass];

                var defaultNumberOfColumns = 3;

                var defaults = {
                    choices: fieldDefinition.Choices, //Come from SharePoint
                    columns: defaultNumberOfColumns,
                    contentUrl: '',
                    description: fieldDefinition.Description, //Comes from SharePoint
                    displayDescription: false,
                    disabled: false,
                    inputClass: '',
                    inputGroup: true,
                    inputGroupClass: 'col-sm-3',
                    label: fieldDefinition.DisplayName, //Comes from SharePoint
                    /* If extended, a lookup field will have a ShowField property that lets us know which field on the
                     * source list we're using for the display value.  It's referencing the SharePoint static name
                     * so we'll need to convert it to caml case.*/
                    lookupField: fieldDefinition.ShowField ? $filter('inflector')(fieldDefinition.ShowField, 'variable') : 'title',
                    max: fieldDefinition.Max,
                    maxlength: undefined,
                    min: fieldDefinition.Min,
                    minlength: undefined,
                    placeholder: null,
                    required: fieldDefinition.Required || false,
                    rows: fieldDefinition.NumLines || 6,
                    validationMessage: '',
                    viewport: 'sm'
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
                    case 'Currency':
                        defaults.contentUrl = 'src/apInputControl.Currency.html';
                        defaults.validationMessage = 'Only numbers and decimal place accepted.';
                        break;
                    case 'Float':
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
                    case 'User':
                        postSetupQueue.push(function() {
                            createLookupArray();
                        });
                        defaults.contentUrl = 'src/apInputControl.Lookup.html';
                        break;
                    case 'UserMulti':
                        postSetupQueue.push(function() {
                            createLookupArray();
                        });
                        defaults.contentUrl = 'src/apInputControl.LookupMulti.html';
                        break;
                    case 'Text':
                        defaults.maxlength = 255;
                    default:
                        defaults.contentUrl = 'src/apInputControl.Text.html';
                }


                var options = _.extend({}, defaults, fieldDefinition, scope);

                /** Put a watch on the field definition object and update options with updated values when changed */
                scope.$watch('fieldDefinition', function (newVal, oldVal) {
                    if(!newVal || newVal === oldVal) return;
                    _.extend(options, newVal);
                }, true);

                if (!_.isString(options.fieldName)) {
                    throw new Error('Field name is either undefined or not a string.  Ensure you place apostrophe\'s' +
                    ' inside the quotes when identifying data-field-name.');
                }

                /** Expose to templates */
                scope.options = options;
                scope.validate = validate;
                scope.getPrimaryTemplate = getPrimaryTemplate;

                function getPrimaryTemplate() {
                    return options.inputGroup ? 'src/apInputGroup.html' : options.contentUrl;
                }

                /** If the class for the group is a function, set a watch to update the class after changing */
                if (_.isFunction(options.groupClass)) {
                    scope.$watch('entity', function () {
                        evaluateContainerClass();
                    }, true);
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
                        options.inputGroupClass = groupClass(options.entity[options.fieldName], options.entity, options.fieldName);
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
                    return 'col-' + options.viewport + '-' + cols;
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
                    createLookupArray();
                }

                function createLookupArray() {
                    /** Create a lookupValue/lookupId formatted array for ui-select */
                    options.lookupArray = [];
                    _.each(options.lookupOptions, function(option) {
                        options.lookupArray.push({lookupValue: option[options.lookupField], lookupId: option.id});
                    });
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
                        return options.validation(val, options);
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
                function dateValidation(val, options) {
                    return val ? _.isDate(val) : true;
                }
            }
        };
    }]);
;'use strict';

/**
 * @ngdoc directive
 * @name angular-point.directive:apInputRow
 * @description
 * Creates individual form controls for each of the field names provided.
 * @param {object} entity SharePoint list item.
 * @param {string[]|string} fields Names of the properties on the entity to create individual form fields for.
 * @param {string} [containerClass='row'] Optional override for the class on the containing element.
 * @param {boolean} [ngDisabled=false] Pass through to disable control using ng-disabled on element if set.
 * @restrict A
 * */
angular.module('angularPoint')
    .directive('apInputRow', ["_", function (_) {
        return {
            scope: {
                entity: '=',
                fields: '=',
                containerClass: '=',
                ngDisabled: '='
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'src/apInputRow.html',
            link: function (scope, elem, attr) {
                /** All either a single field name or array of name to be passed in */
                scope.fieldNameArray = _.isArray(scope.fields) ? scope.fields : [scope.fields];
                scope.state = {
                    /** Default container class is "row" but allows us to override */
                    containerClass: scope.containerClass || 'row'
                }
            }
        };
    }]);
;angular.module('angularPoint').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/apInputContainer.html',
    "<div ng-include=getPrimaryTemplate()></div>"
  );


  $templateCache.put('src/apInputControl.Boolean.html',
    "<button class=\"btn btn-link {{ options.inputClass }}\" ng-click=\"options.entity[options.fieldName] = !options.entity[options.fieldName]\" ng-disabled=options.disabled><i class=\"fa fa-2x {{ options.entity[options.fieldName] ? 'fa-check-square-o' : 'fa-square-o' }}\"></i></button>  <input type=checkbox class=hidden ng-model=options.entity[options.fieldName] ui-validate=\"'validate($value)'\">"
  );


  $templateCache.put('src/apInputControl.Choice.html',
    "<select class=\"form-control {{ options.inputClass }}\" ng-required=options.required ui-validate=\"'validate($value)'\" placeholder=\"{{ options.placeholder }}\" ng-disabled=options.disabled ng-model=options.entity[options.fieldName] ui-validate=\"'validate($value)'\" ng-options=\"choice for choice in options.choices\"></select>"
  );


  $templateCache.put('src/apInputControl.Currency.html',
    "<div class=input-group><span class=input-group-addon><i class=\"fa fa-dollar\"></i></span> <input type=number class=\"form-control {{ options.inputClass }}\" ui-validate=\"'validate($value)'\" ng-model=options.entity[options.fieldName] ng-required=options.required ng-disabled=options.disabled ng-minlength=\"{{ options.minlength }}\" ng-maxlength=\"{{ options.maxlength }}\" min={{options.min}} max={{options.max}} placeholder={{options.placeholder}}></div>"
  );


  $templateCache.put('src/apInputControl.Date.html',
    "<input ui-date class=\"form-control {{ options.inputClass }}\" ui-validate=\"'validate($value)'\" ng-required=options.required ng-disabled=options.disabled placeholder=\"{{ options.placeholder }}\" ng-model=options.entity[options.fieldName]>"
  );


  $templateCache.put('src/apInputControl.HTML.html',
    "<div text-angular class=\"{{ options.inputClass }}\" ng-required=options.required ui-validate=\"'validate($value)'\" name=\"{{ options.fieldName }}\" ta-disabled=options.disabled placeholder={{options.placeholder}} ng-model=options.entity[options.fieldName]></div>"
  );


  $templateCache.put('src/apInputControl.Lookup.html',
    "<div ui-select ng-model=options.entity[options.fieldName] ng-required=options.required ng-disabled=options.disabled class=\"{{ options.inputClass }}\"><div ui-select-match placeholder=\"{{ options.placeholder }}\">{{ $select.selected.lookupValue}}</div><div ui-select-choices data-repeat=\"lookup in options.lookupArray track by lookup.lookupId \">{{ lookup.lookupValue }}</div></div>"
  );


  $templateCache.put('src/apInputControl.LookupMulti.html',
    "<div ui-select multiple ng-model=options.entity[options.fieldName] ui-validate=\"'validate($value)'\" ng-required=options.required ng-disabled=options.disabled class=\"form-control {{ options.inputClass }}\"><div ui-select-match placeholder=\"{{ options.placeholder }}\">{{ $item.lookupValue }}</div><div ui-select-choices data-repeat=\"lookup in options.lookupArray\">{{ lookup.lookupValue }}</div></div>"
  );


  $templateCache.put('src/apInputControl.MultiChoice.html',
    "<div ui-select multiple ng-required=options.required ui-validate=\"'validate($value)'\" ng-disabled=options.disabled ng-model=options.entity[options.fieldName] class=\"form-control {{ options.inputClass }}\"><div ui-select-match placeholder=\"{{ options.placeholder }}\">{{ $item }}</div><div ui-select-choices data-repeat=\"choice in options.choices\">{{ choice }}</div></div>"
  );


  $templateCache.put('src/apInputControl.Note.html',
    "<textarea ng-model=options.entity[options.fieldName] ui-validate=\"'validate($value)'\" class=\"form-control {{ options.inputClass }}\" rows={{options.rows}} ng-required=options.required ng-disabled=options.disabled placeholder={{options.placeholder}}>\n" +
    "</textarea>"
  );


  $templateCache.put('src/apInputControl.Number.html',
    "<input type=number class=\"form-control {{ options.inputClass }}\" ui-validate=\"'validate($value)'\" ng-model=options.entity[options.fieldName] ng-required=options.required ng-disabled=options.disabled min={{options.min}} max={{options.max}} ng-minlength=\"{{ options.minlength }}\" ng-maxlength=\"{{ options.maxlength }}\" placeholder={{options.placeholder}}>"
  );


  $templateCache.put('src/apInputControl.Text.html',
    "<input class=\"form-control {{ options.inputClass }}\" ui-validate=\"'validate($value)'\" ng-model=options.entity[options.fieldName] ng-required=options.required ng-disabled=options.disabled ng-minlength=\"{{ options.minlength }}\" ng-maxlength=\"{{ options.maxlength }}\" placeholder={{options.placeholder}}>"
  );


  $templateCache.put('src/apInputGroup.html',
    "<div class={{options.inputGroupClass}} ng-form=apInput><div class=form-group title={{options.description}} ng-class=\"{'has-error': apInput.$invalid}\"><label class=control-label>{{ options.label }} {{options.required ? '*' : ''}}</label><div ng-include=options.contentUrl ng-disabled=ngDisabled></div><span class=help-text ng-if=options.displayDescription>{{ options.description }}</span> <span class=text-danger ng-if=apInput.$invalid>{{ options.validationMessage }}</span></div></div>"
  );


  $templateCache.put('src/apInputRow.html',
    "<div class=\"{{ options.containerClass }}\"><div ng-repeat=\"fieldName in fieldNameArray\" ap-input-group data-entity=entity data-field-name=fieldName></div></div>"
  );

}]);
