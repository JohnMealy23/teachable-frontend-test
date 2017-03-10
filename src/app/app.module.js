import angular from 'angular';

const MODULE_NAME = 'app';

export const AppModule = angular.module(MODULE_NAME, []);

let logging = true;
const logger = function() {
    if(logging === true) {
        console.log(...arguments);
    }
};

const config = {};

config.RetreiveGemData = {
    api: {
        dependecies: gem => `/api/v1/gems/${gem}/reverse_dependencies.json`,
        gem: gem => `/api/v1/gems/${gem}.json`,
        search: gem =>  `/api/v1/search.json?query=${gem}`
    },
    dynamicRequestsOn: true
};

config.FavoriteService = {
    localStorageKey: 'gemFavorites'
};


AppModule.service('ShowDependencies',function() {
    this.registry = {};
    this.toggle = (name) => {
        this.registry[name] = !this.registry[name];
    };
});

AppModule.service('RetreiveGemData',function($http) {
    let throttle;
    let throttled = false;
    const dynamicRequestsOn = config.RetreiveGemData.dynamicRequestsOn || false;
    const throttleTime = 200;
    this.data = {};
    this.data.results = [];
    const sendRequest = (query) => {
        logger('RetreiveGemData.sendRequest',{query});
        return $http({
            method: 'GET',
            url: config.RetreiveGemData.api.search(query)
        })
            .then((response) => {
                logger('sendRequest',{response});
                if(response && Array.isArray(response.data)) {
                    this.data.gems = response.data;
                    console.log('results:',this.data.gems);
                } else {
                    this.data.results = [];
                }
                throttled = false;
            });
    };
    this.update = (query = '', key) => {
        logger('RetreiveGemData.update',{query, key});
        // If enter was hit, send request immediately:
        if(key === 13) {
            sendRequest(query);
            clearTimeout(throttle);
        } else if(throttled === false && dynamicRequestsOn) {
            // If user is typing, throttle requests:
            throttled = true;
            throttle = setTimeout(() => sendRequest(query), throttleTime);
        }
    };
});

AppModule.service('FavoriteService',function($window) {
    const ls = $window.localStorage.getItem(config.FavoriteService.localStorageKey) || '{}';
    this.data = {};
    this.data.store = JSON.parse(ls);
    this.save = (gemObj) => {
        logger(`saving gem ${gemObj.name}`, gemObj);
        this.data.store[gemObj.name] = gemObj;
        $window.localStorage.setItem(config.FavoriteService.localStorageKey, JSON.stringify(this.data.store));
    };
    this.remove = (gemObj) => {
        logger(`removing gem ${gemObj.name}`, gemObj);
        delete this.data.store[gemObj.name];
        $window.localStorage.setItem(config.FavoriteService.localStorageKey, JSON.stringify(this.data.store));
    };
});

AppModule.controller('GemSearchController', function GemListController($scope, RetreiveGemData) {
    $scope.gemName = '';
    $scope.updateSearch = (event) => {
        const key = event.which;
        const query = $scope.gemName;
        logger('GemSearchController.updateSearch',{query, key});
        RetreiveGemData.update(query, key);
    }
});

AppModule.controller('GemListController', function GemListController($scope, RetreiveGemData, ShowDependencies, FavoriteService) {
    $scope.showDependencies = ShowDependencies;
    $scope.data = RetreiveGemData.data;
    $scope.favoriteData = FavoriteService.data;
    $scope.addFavorite = (gem) => {
        console.log('adding favorite',{gem});
        FavoriteService.save(gem);
    }
    $scope.removeFavorite = (gem) => {
        console.log('remove favorite',{gem});
        FavoriteService.remove(gem);
    }
});

AppModule.controller('FavoritesListController', function($scope, FavoriteService) {
    $scope.remove = FavoriteService.remove;
    $scope.data = FavoriteService.data;
    $scope.favoriteCount = () => Object.keys(FavoriteService.data.store).length;
});

export default AppModule;