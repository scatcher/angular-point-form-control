/**
 * @ngdoc directive
 * @name angular-point.directive:apInput
 *
 * @description
 * _Please update the description and restriction._
 *
 * @restrict A
 * */


angular.module('RTM')
    .directive('angularPoint', function (_) {
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
    });
