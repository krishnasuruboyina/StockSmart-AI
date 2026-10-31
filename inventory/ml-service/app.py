from flask import Flask, request, jsonify
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from statsmodels.tsa.holtwinters import SimpleExpSmoothing
import numpy as np
import warnings

app = Flask(__name__)
warnings.filterwarnings("ignore")


def naive_forecast(history):
    return float(history[-1])


def moving_average_forecast(history):
    window = min(3, len(history))
    return float(np.mean(history[-window:]))


def linear_forecast(history):
    values = np.asarray(history, dtype=float)
    X = np.arange(len(values)).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, values)

    return max(0.0, float(
        model.predict([[len(values)]])[0]
    ))


def exponential_smoothing_forecast(history):
    values = np.asarray(history, dtype=float)

    model = SimpleExpSmoothing(
        values,
        initialization_method="estimated"
    ).fit(optimized=True)

    return max(0.0, float(model.forecast(1)[0]))


MODELS = {
    "naive": naive_forecast,
    "moving_average": moving_average_forecast,
    "linear_regression": linear_forecast,
    "exponential_smoothing": exponential_smoothing_forecast,
}


def evaluate_model(history, forecast_function):
    errors = []

    # Evaluate one-step predictions on historical holdout points.
    # Use the same time order as the actual sales history.
    for split in range(3, len(history)):
        training = history[:split]
        actual = float(history[split])

        try:
            predicted = forecast_function(training)

            if np.isfinite(predicted):
                errors.append(abs(actual - predicted))
        except Exception:
            continue

    if not errors:
        return None

    return float(np.mean(errors))


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "AI Demand Forecasting Service is running"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        sales = data.get("sales")

        if not isinstance(sales, list) or len(sales) < 5:
            return jsonify({
                "success": False,
                "message": "Provide at least 5 historical sales values"
            }), 400

        if len(sales) > 5000:
            return jsonify({
                "success": False,
                "message": "Maximum 5000 sales values allowed"
            }), 400

        if any(
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not np.isfinite(value)
            or value < 0
            for value in sales
        ):
            return jsonify({
                "success": False,
                "message": "Sales must be finite non-negative numbers"
            }), 400

        history = np.asarray(sales, dtype=float)

        # Evaluate every model using historical one-step forecasts.
        scores = {}

        for name, forecast_function in MODELS.items():
            score = evaluate_model(history, forecast_function)

            if score is not None and np.isfinite(score):
                scores[name] = score

        if not scores:
            return jsonify({
                "success": False,
                "message": "Not enough data to evaluate models"
            }), 400

        best_name = min(scores, key=scores.get)
        best_model = MODELS[best_name]

        prediction = max(0.0, float(best_model(history)))

        return jsonify({
            "success": True,
            "historicalSales": sales,
            "predictedNextPeriodDemand": round(prediction, 2),
            "selectedModel": best_name,
            "validationMAE": round(scores[best_name], 2),
            "modelScores": {
                name: round(score, 2)
                for name, score in scores.items()
            },
            "note": (
                "Experimental one-step forecast. "
                "Model selection uses historical MAE; "
                "future accuracy is not guaranteed."
            )
        })

    except Exception:
        app.logger.exception("Forecast generation failed")

        return jsonify({
            "success": False,
            "message": "Could not generate forecast"
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False
    )