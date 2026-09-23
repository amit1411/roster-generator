import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from roster_engine import (
    RosterError,
    find_duplicate_fixed_pair_matchups,
    generate_fixed_pair_knockout_roster,
    generate_roster,
    validate_roster,
)


def matchup_counts(rounds):
    counts = {}
    for round_data in rounds:
        for team_a, team_b in round_data["courts"]:
            key = tuple(sorted((tuple(sorted(team_a)), tuple(sorted(team_b)))))
            counts[key] = counts.get(key, 0) + 1
    return counts


def assert_valid_serialized_rounds(testcase, rounds, players, fixed_pairs, num_courts):
    for round_data in rounds:
        testcase.assertLessEqual(len(round_data["courts"]), num_courts)
        playing = [player for team_a, team_b in round_data["courts"] for player in team_a + team_b]
        testcase.assertEqual(len(playing), len(set(playing)))
        testcase.assertEqual(sorted(playing + round_data["resting"]), sorted(players))


class KnockoutFixedPairTests(unittest.TestCase):
    def test_generates_single_meeting_schedule_for_four_fixed_pairs(self):
        players = ["A", "B", "C", "D", "E", "F", "G", "H"]
        fixed_pairs = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]

        rounds, rest_counts, fixed_pair_counts, warnings = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=3,
            pair_target=3,
        )

        self.assertEqual(len(rounds), 3)
        self.assertEqual(warnings, [])
        self.assertTrue(all(rested == 0 for rested in rest_counts.values()))
        self.assertEqual(set(fixed_pair_counts.values()), {3})
        self.assertTrue(all(count == 1 for count in matchup_counts(rounds).values()))
        self.assertEqual(find_duplicate_fixed_pair_matchups(rounds, fixed_pairs), [])

    def test_serializes_six_pair_league_onto_two_courts(self):
        players = [f"P{index}" for index in range(12)]
        fixed_pairs = [
            (players[2 * index], players[2 * index + 1])
            for index in range(6)
        ]

        rounds, rest_counts, fixed_pair_counts, warnings = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=8,
            pair_target=5,
        )

        self.assertEqual(len(rounds), 8)
        self.assertEqual(warnings, [])
        assert_valid_serialized_rounds(self, rounds, players, fixed_pairs, 2)

        counts = matchup_counts(rounds)
        self.assertEqual(len(counts), 15)
        self.assertTrue(all(count == 1 for count in counts.values()))
        self.assertEqual(set(fixed_pair_counts.values()), {5})
        self.assertEqual(set(rest_counts.values()), {3})
        self.assertEqual(find_duplicate_fixed_pair_matchups(rounds, fixed_pairs), [])
        self.assertEqual(
            validate_roster(rounds, {}, 1, fixed_pairs, fixed_pair_counts, 5, 1),
            [],
        )

    def test_serializes_double_meeting_six_pair_league_onto_two_courts(self):
        players = [f"P{index}" for index in range(12)]
        fixed_pairs = [
            (players[2 * index], players[2 * index + 1])
            for index in range(6)
        ]

        rounds, rest_counts, fixed_pair_counts, warnings = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=16,
            pair_target=10,
        )

        self.assertEqual(len(rounds), 16)
        self.assertEqual(warnings, [])
        assert_valid_serialized_rounds(self, rounds, players, fixed_pairs, 2)

        counts = matchup_counts(rounds)
        self.assertEqual(len(counts), 15)
        self.assertTrue(all(count == 2 for count in counts.values()))
        self.assertEqual(set(fixed_pair_counts.values()), {10})
        self.assertEqual(set(rest_counts.values()), {6})
        self.assertEqual(
            validate_roster(rounds, {}, 1, fixed_pairs, fixed_pair_counts, 10, 1),
            [],
        )

    def test_serializes_odd_pair_league_onto_fewer_courts(self):
        players = [f"P{index}" for index in range(14)]
        fixed_pairs = [
            (players[2 * index], players[2 * index + 1])
            for index in range(7)
        ]

        rounds, rest_counts, fixed_pair_counts, warnings = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=11,
            pair_target=6,
        )

        self.assertEqual(len(rounds), 11)
        self.assertEqual(warnings, [])
        assert_valid_serialized_rounds(self, rounds, players, fixed_pairs, 2)

        counts = matchup_counts(rounds)
        self.assertEqual(len(counts), 21)
        self.assertTrue(all(count == 1 for count in counts.values()))
        self.assertEqual(set(fixed_pair_counts.values()), {6})

    def test_generates_odd_team_schedule_without_duplicate_opponents(self):
        players = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
        fixed_pairs = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H"), ("I", "J")]

        rounds, rest_counts, fixed_pair_counts, warnings = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=5,
            pair_target=4,
        )

        self.assertEqual(len(rounds), 5)
        self.assertEqual(warnings, [])
        self.assertEqual(set(rest_counts.values()), {1})
        self.assertEqual(set(fixed_pair_counts.values()), {4})
        self.assertEqual(len(matchup_counts(rounds)), 10)
        self.assertTrue(all(count == 1 for count in matchup_counts(rounds).values()))
        self.assertEqual(find_duplicate_fixed_pair_matchups(rounds, fixed_pairs), [])

    def test_generates_multiple_meetings_for_fixed_pair_knockout(self):
        players = ["A", "B", "C", "D", "E", "F", "G", "H"]
        fixed_pairs = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]

        rounds, _, fixed_pair_counts, _ = generate_fixed_pair_knockout_roster(
            players=players,
            fixed_pairs=fixed_pairs,
            num_courts=2,
            num_rounds=6,
            pair_target=6,
        )

        self.assertEqual(len(rounds), 6)
        self.assertEqual(set(fixed_pair_counts.values()), {6})
        self.assertTrue(all(count == 2 for count in matchup_counts(rounds).values()))

    def test_duplicate_matchup_validator_flags_repeated_knockout_pairings(self):
        fixed_pairs = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]
        rounds = [
            {"round": 1, "courts": [(("A", "B"), ("C", "D")), (("E", "F"), ("G", "H"))], "resting": []},
            {"round": 2, "courts": [(("A", "B"), ("C", "D")), (("E", "F"), ("G", "H"))], "resting": []},
        ]

        violations = find_duplicate_fixed_pair_matchups(rounds, fixed_pairs)

        self.assertEqual(len(violations), 2)
        self.assertTrue(all(violation.startswith("Duplicate knockout matchup:") for violation in violations))

    def test_plain_round_robin_generator_remains_available(self):
        rounds, _, _, _ = generate_roster(
            players=["A", "B", "C", "D"],
            num_courts=1,
            num_rounds=1,
            consecutive_limits={},
            fixed_pairs=[],
            pair_target=1,
            max_consecutive_rest=1,
            pair_start_round=1,
            seed=1,
        )

        self.assertEqual(len(rounds), 1)

    def test_rejects_more_courts_than_simultaneous_matches(self):
        players = [f"P{index}" for index in range(12)]
        fixed_pairs = [
            (players[2 * index], players[2 * index + 1])
            for index in range(6)
        ]

        with self.assertRaises(RosterError) as context:
            generate_fixed_pair_knockout_roster(
                players=players,
                fixed_pairs=fixed_pairs,
                num_courts=4,
                num_rounds=5,
                pair_target=5,
            )

        self.assertIn("at most 3 court(s)", str(context.exception))

    def test_rejects_rounds_not_multiple_of_serialized_meeting(self):
        players = [f"P{index}" for index in range(12)]
        fixed_pairs = [
            (players[2 * index], players[2 * index + 1])
            for index in range(6)
        ]

        with self.assertRaises(RosterError) as context:
            generate_fixed_pair_knockout_roster(
                players=players,
                fixed_pairs=fixed_pairs,
                num_courts=2,
                num_rounds=7,
                pair_target=5,
            )

        self.assertIn("multiple of 8", str(context.exception))


if __name__ == "__main__":
    unittest.main()
