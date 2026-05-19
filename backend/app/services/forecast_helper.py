import numpy as np

def linear_forecast(historical: list, periods: int) -> list:
    """ historical: list of (month_index, value) sorted by month_index. """
    if len(historical) < 2:
        return [historical[-1][1]] * periods if historical else [0] * periods
    xs = np.array([h[0] for h in historical])
    ys = np.array([h[1] for h in historical])
    coeffs = np.polyfit(xs, ys, 1)
    last_index = xs[-1]
    forecast = []
    for i in range(1, periods + 1):
        forecast.append(round(float(np.polyval(coeffs, last_index + i)), 2))
    return forecast