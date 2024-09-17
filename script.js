'use strict';

class Workout{
    #coords;
    #distance;
    #duration;
    #date;
    #id;
    #description;

    constructor(coords,distance, duration){
        this.#coords = coords; //[]
        this.#distance = distance; //km
        this.#duration = duration; // min
        this.#date = new Date();
        this.#id = (Date.now()+'').slice(-10); //Convert the date into string and take the last 10 chars as a unique identifier
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.#description = `${this.getType()[0].toUpperCase()}${this.getType().slice(1)} on ${months[this.#date.getMonth()]} ${this.#date.getDate()}`;
    }

    getCoords(){
        return this.#coords;
    }
    getDuration(){
        return this.#duration;
    }

    getDistance(){
        return this.#distance;
    }

    getId(){
        return this.#id;
    }

    getDescription(){
        return this.#description;
    }

    setDate(date) { this.#date = new Date(date); }

    setId(id) { this.#id = id; }
    
    setDuration(duration){
        this.#duration = duration;
    }

    setdistance(distance){
        this.#distance = distance;
    }
    setCoords(coords){
        this.#coords = coords;
    }

    toJSON(){
       return { coord:this.#coords,
                distance:this.#distance,
                duration:this.#duration,
                date:this.#date,
                id:this.#id,
                description:this.#description
        }
    }
}

class Running extends Workout{
    #type = 'running';
    #cadence;
    #pace;
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.#cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        //min/km
       return this.#pace = this.getDuration() / this.getDistance();
       
    }

    setCadence(cadence){
        this.#cadence = cadence;
    }

     getType(){
        return this.#type;
    }

    getCadence(){
        return this.#cadence;
    }

 // Override the toJSON method to include specific fields for Running
    toJSON(){
        return {
            ...super.toJSON(),
            type:this.#type,
            cadence: this.#cadence,
            pace:this.#pace
        }
    }
}

class Cycling extends Workout{
    #type = 'cycling';
    #elevationGain;
    #speed;
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.#elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    //km/h
    calcSpeed(){
        return this.#speed = this.getDistance() / (this.getDuration() / 60);
    }

    getType(){
        return this.#type;
    }

    getElevation(){
        return this.#elevationGain;
    }
    
    setElevation(elevation){
        this.#elevationGain = elevation;
    }

    // Override the toJSON method to include specific fields for Cycling

    toJSON(){
        return{
            ...super.toJSON(),
            type:this.#type,
            elevationGain :this.#elevationGain,
            speed:this.#speed
        }
    }
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//APP Architecture

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class App{

    #map;
    #mapEvent;
    #mapZoomLevel = 15;
    #workouts = [];

    constructor(){
        //Get User's Positions
        this._getPosition();

        //Get data from local storage
        this._getLocalStorage();

        //AttachEventHandlers
        form.addEventListener('submit', this._newWorkOut.bind(this));
        inputType.addEventListener('change',this._toggleElevationFiled);
        containerWorkouts.addEventListener('click', this._movePopUp.bind(this));
    }

    _getPosition(){
        //navigator gets two callbacks, one for success current position and one if could not find it
        if (navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),position=>console.log(`Could not find your position, ${position}`));
        }
    }

    _getZoomLevel(){
        return this.#mapZoomLevel;
    }

    _getWorkouts(){
        return this.#workouts;
    }

    _loadMap(position){
            const {latitude,longitude} = position.coords;
            const coords = [latitude,longitude];
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

            L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.fr/hot/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);

            //Handling clicks on map
            this.#map.on('click',this._showForm.bind(this))
            // Show the markers afters the map loads and after we take them from the local storage
            this.#workouts.forEach(work => this._renderWorkoutmarker(work));
    }

    _movePopUp(e){
        const workoutEl = e.target.closest('.workout');
        if(!workoutEl) return;
        const workout = this.#workouts.find(work=> work.getId() === workoutEl.dataset.id);
        //
        this.#map.setView(workout.getCoords(),this.#mapZoomLevel, {
            animate: true,
            pan :{
                duration : 1
            }
        })
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        //console.log(this.#mapEvent);
        form.classList.remove('hidden');
        inputDistance.focus();   
    }


    _hideForm(){
        inputDistance.value ="";
        inputDuration.value = "";
        inputElevation.value = "";
        inputCadence.value ="";
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=>{
            form.style.display = 'grid';
        },1000);
    }

    _toggleElevationFiled() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkOut(e){

        const  validInput = (...inputs)=> inputs.every(inp=>Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp=>inp>0);
        
        e.preventDefault();

        //Get Data From Workout
        const type = inputType.value;
        const distance = +inputDistance.value
        const duration = +inputDuration.value;
        const {lat,lng} = this.#mapEvent.latlng;
        let workout;

        // if workout running, create running object
        if(type==='running'){
            const cadence = +inputCadence.value;
            // Check if Data is valid
            if (!validInput(distance,duration,cadence) || !allPositive(distance,duration,cadence)) return alert(new Error('Inputs have to be positive numbers'));

            workout = new Running([lat,lng], distance, duration ,cadence);
            
        }

        // if workout cycling, create cycling object
        if(type=== 'cycling'){
            const elevation = +inputElevation.value;
            // Check if Data is valid
            if (!validInput(distance,duration,elevation) || !allPositive(distance,duration,elevation)) return alert(new Error('Inputs have to be positive numbers'));
            workout = new Cycling([lat,lng], distance, duration ,elevation);
        }

        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutmarker(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Hide form + Clear input fields
        this._hideForm();

        // Set Local Storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutmarker(workout){
     
        L.marker(workout.getCoords())
            .addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth:250,
                minWidth :100,
                closeOnClick: false,
                autoClose:false,
                className:`${workout.getType()}-popup`,
            }))
            .setPopupContent(`${
                workout.getType() === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            } ${workout.getDescription()}`)
            .openPopup();
    }


    _renderWorkout(workout){
        let html = `
        <li class="workout workout--${workout.getType()}" data-id="${workout.getId()}">
          <h2 class="workout__title">${workout.getDescription()}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.getType() === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }
            </span>
            <span class="workout__value">${workout.getDistance()}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.getDuration()}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

          if (workout.getType() === 'running'){
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.calcPace().toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.getCadence()}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>
            `;
          }

          if (workout.getType() === 'cycling'){
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.calcSpeed().toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.getElevation()}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
            `;
          }
          form.insertAdjacentHTML('afterend',html);
    }

    _setLocalStorage(){
        this.#workouts.forEach(work=>{
            localStorage.setItem('workouts',JSON.stringify(work.toJSON()));
        })
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;
    
        this.#workouts = data.map(workout => {
            let workoutInstance;
    
            // Recreate the correct class instance based on the workout type
            // we have to do that because otherwise that won't work!
            // From the local storage we got the serialiased objects, just plain objects
            // and the workout chain like toJSON() method did not work
            if (workout.type === 'running') {
                workoutInstance = new Running(
                    workout.coord,
                    workout.distance,
                    workout.duration,
                    workout.cadence
                );
            } else if (workout.type === 'cycling') {
                workoutInstance = new Cycling(
                    workout.coord,
                    workout.distance,
                    workout.duration,
                    workout.elevationGain
                );
            }
    
            // Reassign the date and id
            workoutInstance.setDate(workout.date);
            workoutInstance.setId(workout.id);
    
            return workoutInstance;
        });
    
        // Re-render the workouts
        this.#workouts.forEach(work => this._renderWorkout(work));
    }
    
    
}

const app = new App();