'use strict';

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
    .directive('apInputRow', function (_) {
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
    });
