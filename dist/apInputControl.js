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
    .directive('apInputGroup', ["_", "apCacheService", function (_, apCacheService) {
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
    }]);
;/**
 * @ngdoc directive
 * @name angular-point.directive:apInput
 *
 * @description
 * _Please update the description and restriction._
 *
 * @restrict A
 * */


angular.module('RTM')
    .directive('apInputRow', ["_", function (_) {
        return {
            ngDisabled: '=',     //Pass through to disable control using ng-disabled on element if set
            scope: {
                entity: '=',
                fields: '='
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'src/apInputRow.html',
            link: function (scope, elem, attr) {
                /** All either a single field name or array of name to be passed in */
                scope.fieldNameArray = _.isArray(scope.fields) ? scope.fields : [scope.fields];
            }
        };
    }]);
;angular.module('angularPoint').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('src/apInputControl.Boolean.html',
    "<button class=\"btn btn-link\" ng-click=\"entity[fieldName] = !entity[fieldName]\"><i class=\"fa fa-2x {{ entity[fieldName] ? 'fa-check-square-o' : 'fa-square-o' }}\"></i></button>"
  );


  $templateCache.put('src/apInputControl.Choice.html',
    "<select class=form-control ng-model=entity[fieldName] ng-options=\"choice for choice in fieldDefinition.Choices\"></select>"
  );


  $templateCache.put('src/apInputControl.Date.html',
    "<input ui-date class=form-control ng-model=entity[fieldName]>"
  );


  $templateCache.put('src/apInputControl.HTML.html',
    "<div ng-if=\"fieldDefinition.objectType === 'HTML'\" text-angular ng-model=entity[fieldName]></div>"
  );


  $templateCache.put('src/apInputControl.Lookup.html',
    "<select ng-model=state.placeholderValue ng-disabled=ngDisabled ng-change=updateSingleSelectLookup(state.placeholderValue) ng-options=\"lookup.id as lookup[state.lookupField] for (lookupId, lookup) in lookupOptions\" class=form-control></select>"
  );


  $templateCache.put('src/apInputControl.LookupMulti.html',
    "<select ui-select2 multiple ng-model=state.placeholderValue ng-change=updateMultiModel() ng-disabled=ngDisabled class=form-control><option ng-repeat=\"lookup in lookupOptions\" value=\"{{ lookup.id }}\" ng-bind=lookup[state.lookupField]>&nbsp;</option></select>"
  );


  $templateCache.put('src/apInputControl.MultiChoice.html',
    "<select ui-select2 multiple ng-model=entity[fieldName] class=form-control><option value=\"\"></option><option ng-repeat=\"choice in fieldDefinition.Choices\" value={{choice}}>{{choice}}</option></select>"
  );


  $templateCache.put('src/apInputControl.Note.html',
    "<textarea ng-model=entity[fieldName] style=width:100% name={{fieldName}} ng-disabled=disabled ui-validate=\"'validation($value)'\" class=form-conrol rows={{rows}}></textarea>"
  );


  $templateCache.put('src/apInputControl.Text.html',
    "<input type=\"{{inputType || 'text'}}\" class=form-control ng-model=entity[fieldName]>"
  );


  $templateCache.put('src/apInputGroup.html',
    "<div class=col-md-{{cols}}><div class=form-group title={{description}} ng-class=\"{'has-error': $form[fieldName].$invalid}\"><label>{{ label }}</label><div ng-include=contentUrl ng-disabled=ngDisabled></div></div></div>"
  );


  $templateCache.put('src/apInputRow.html',
    "<div class=row><div ng-repeat=\"fieldName in fieldNameArray\" ap-input-group data-entity=entity data-field-name=fieldName></div></div>"
  );

}]);
