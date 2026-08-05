# Store auto-test report

Checked 2026-08-05.

The exact default input was run ten times locally with `apify run --purge`.

| Run | Exit | Summary duration | Wall time | Snapshots | Match |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 0 | 5s | 8.05s | 1 | matched |
| 2 | 0 | 2s | 5.25s | 1 | matched |
| 3 | 0 | 2s | 5.36s | 1 | matched |
| 4 | 0 | 3s | 6.39s | 1 | matched |
| 5 | 0 | 2s | 5.60s | 1 | matched |
| 6 | 0 | 2s | 5.46s | 1 | matched |
| 7 | 0 | 2s | 4.53s | 1 | matched |
| 8 | 0 | 2s | 5.04s | 1 | matched |
| 9 | 0 | 2s | 4.64s | 1 | matched |
| 10 | 0 | 2s | 4.71s | 1 | matched |

Every run wrote `RUN_SUMMARY` and `CHANGE_REPORT`. The Open Library empty-result warning appeared without removing the Kitsu/VIZ snapshot. Auto-test result: 10/10 succeeded.
